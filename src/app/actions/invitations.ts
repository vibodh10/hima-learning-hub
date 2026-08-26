"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { configuredAppOrigin, resolveAppOrigin } from "@/lib/app-origin";
import { requireRole } from "@/lib/auth";
import {
  runInvitationWorkflow,
  type ExistingAccountResolution,
  type InvitationGateway,
  type InvitationInput,
} from "@/lib/invitation-workflow";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type InvitationState = { ok?: boolean; message?: string; errors?: Record<string, string[]> };

const invitation = z.object({
  classId: z.uuid(),
  name: z.string().trim().min(2, "Enter the student's full name.").max(80),
  email: z.email("Enter a valid student email address.").trim().toLowerCase(),
});

const blockedMessages: Record<string, string> = {
  archived_account: "This student account is archived. Ask an administrator to restore it before enrolling the student.",
  different_organisation: "This email already belongs to another organisation and cannot be attached to this class.",
  staff_account: "This email belongs to a staff account and cannot be enrolled as a student.",
  account_exists: "This email already has an account that could not be safely connected. Ask an administrator to review it.",
  auth_lookup_failed: "The account directory could not be checked. No duplicate invitation was sent; please retry shortly.",
  delivery_failed: "The invitation email could not be sent. Check the mail configuration or retry shortly.",
  invitation_record_failed: "The invitation could not be recorded. No email was sent.",
  invalid_auth_account: "The invited account could not be verified. Ask an administrator to review it.",
  profile_conflict: "The invited account conflicts with an existing profile and was not changed.",
  association_failed: "The student account could not be assigned to the class. Please retry or ask an administrator.",
};

export async function inviteStudent(_: InvitationState, formData: FormData): Promise<InvitationState> {
  const parsed = invitation.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const actor = await requireRole("teacher", "administrator");
  const sessionClient = await createClient();
  const classQuery = sessionClient
    .from("classes")
    .select("id,name,organisation_id,teacher_id,published,class_units!inner(unit_id,active)")
    .eq("id", parsed.data.classId)
    .is("archived_at", null);
  const { data: classData } = await classQuery.single();
  if (!classData || classData.organisation_id !== actor.organisation_id) {
    return { message: "You can only invite students to your own active class." };
  }
  if (!classData.published || !classData.class_units.some(unit => unit.active)) {
    return { message: "Choose and publish at least one unit before inviting students." };
  }

  const origin = resolveAppOrigin({
    configuredOrigin: configuredAppOrigin(),
    requestOrigin: (await headers()).get("origin"),
  });
  if (!origin) return { message: "The public application URL is not configured, so no invitation was sent." };

  const input: InvitationInput = {
    classId: classData.id,
    organisationId: actor.organisation_id,
    invitedBy: actor.id,
    displayName: parsed.data.name,
    email: parsed.data.email,
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  };
  const result = await runInvitationWorkflow(input, createInvitationGateway(sessionClient, actor.id));

  if (result.kind === "blocked") {
    return { message: blockedMessages[result.code] ?? "The invitation could not be completed safely. Please retry or ask an administrator." };
  }

  await createAdminClient().from("audit_logs").insert({
    organisation_id: actor.organisation_id,
    actor_id: actor.id,
    action: result.kind === "connected" ? "student.connected" : "student.invited",
    entity_type: "student_invitation",
    entity_id: result.invitationId,
    after_data: { invited_user_id: result.userId, class_id: classData.id, outcome: result.kind },
  });
  revalidatePath(`/teacher/classes/${classData.id}`);

  if (result.kind === "connected") {
    return { ok: true, message: `${parsed.data.name}'s existing account is now assigned to ${classData.name}. No new email was needed.` };
  }
  if (result.kind === "sent_pending_association") {
    return { ok: true, message: `Invitation sent to ${parsed.data.email}. The account association will be retried when the student accepts the link.` };
  }
  return { ok: true, message: `Invitation sent to ${parsed.data.email}. The student can use the secure email link to choose a password and open ${classData.name}.` };
}

type SessionClient = Awaited<ReturnType<typeof createClient>>;

function createInvitationGateway(sessionClient: SessionClient, actorId: string): InvitationGateway {
  const admin = createAdminClient();
  return {
    async begin(input) {
      const { data, error } = await admin.from("student_invitations").upsert({
        organisation_id: input.organisationId,
        class_id: input.classId,
        email_normalized: input.email,
        display_name: input.displayName,
        invited_by: input.invitedBy,
        status: "pending",
        last_detail_code: "requested",
        updated_at: new Date().toISOString(),
      }, { onConflict: "class_id,email_normalized" }).select("id").single();
      return error || !data ? { errorCode: "invitation_record_failed" } : { invitationId: data.id as string };
    },

    async resolveExisting(email): Promise<ExistingAccountResolution> {
      const { data, error } = await sessionClient.rpc("resolve_invitable_auth_user", { target_email: email });
      const resolution = Array.isArray(data) ? data[0] : data;
      if (error || !resolution) return { kind: "blocked", code: "auth_lookup_failed" };
      if (!resolution.account_exists) return { kind: "none" };
      if (!resolution.permitted || !resolution.user_id) {
        return { kind: "blocked", code: resolution.block_code ?? "account_exists" };
      }
      return { kind: "connectable", userId: resolution.user_id as string };
    },

    async sendNewUserInvite(input) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
        redirectTo: input.redirectTo,
        data: {
          display_name: input.displayName,
          requested_role: "student",
          invited_class_id: input.classId,
          invited_organisation_id: input.organisationId,
          invitation_id: input.invitationId,
        },
      });
      if (error || !data.user) {
        const message = error?.message.toLowerCase() ?? "";
        const accountMayExist = message.includes("already") || message.includes("registered") || message.includes("exists");
        return { errorCode: accountMayExist ? "account_exists" : "delivery_failed", accountMayExist };
      }
      return { userId: data.user.id };
    },

    async connect(input) {
      const { data: authData, error: authError } = await admin.auth.admin.getUserById(input.userId);
      if (authError || !authData.user || authData.user.email?.trim().toLowerCase() !== input.email) {
        return { ok: false, errorCode: "invalid_auth_account" };
      }

      const { data: profile, error: profileReadError } = await admin.from("user_profiles")
        .select("id,organisation_id,role,archived_at")
        .eq("id", input.userId)
        .maybeSingle();
      if (profileReadError) return { ok: false, errorCode: "association_failed" };
      if (profile && (profile.organisation_id !== input.organisationId || profile.role !== "student" || profile.archived_at)) {
        return { ok: false, errorCode: "profile_conflict" };
      }
      if (!profile) {
        const { error } = await admin.from("user_profiles").insert({
          id: input.userId,
          organisation_id: input.organisationId,
          role: "student",
          display_name: input.displayName,
        });
        if (error) return { ok: false, errorCode: "association_failed" };
      }

      const { error: enrolmentError } = await admin.from("enrolments").upsert({
        class_id: input.classId,
        student_id: input.userId,
        archived_at: null,
      }, { onConflict: "class_id,student_id" });
      return enrolmentError ? { ok: false, errorCode: "association_failed" } : { ok: true };
    },

    async mark({ invitationId, status, userId, detailCode }) {
      const { data: current } = await admin.from("student_invitations")
        .select("send_count")
        .eq("id", invitationId)
        .maybeSingle();
      const timestamp = new Date().toISOString();
      const update: Record<string, unknown> = { status, last_detail_code: detailCode, updated_at: timestamp };
      if (userId) update.auth_user_id = userId;
      if (status === "sent" && detailCode === "email_requested") {
        update.last_sent_at = timestamp;
        update.send_count = Number(current?.send_count ?? 0) + 1;
      }
      if (status === "accepted") update.accepted_at = timestamp;
      await admin.from("student_invitations").update(update).eq("id", invitationId);
      await admin.from("student_invitation_events").insert({
        invitation_id: invitationId,
        actor_id: actorId,
        status,
        detail_code: detailCode,
      });
    },
  };
}
