"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { configuredAppOrigin, resolveAppOrigin } from "@/lib/app-origin";
import { requireRole } from "@/lib/auth";
import { classInvitationReadiness } from "@/lib/class-invitation-readiness";
import {
  runInvitationWorkflow,
  type ExistingAccountResolution,
  type InvitationGateway,
  type InvitationInput,
} from "@/lib/invitation-workflow";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { unitByCode } from "@/lib/learning-catalog";

export type InvitationState = { ok?: boolean; message?: string; errors?: Record<string, string[]> };

const invitation = z.object({
  classId: z.uuid(),
  name: z.string().trim().min(2, "Enter the student's full name.").max(80),
  email: z.email("Enter a valid student email address.").trim().toLowerCase(),
});

const invitationManagement = z.object({
  invitationId: z.uuid(),
  classId: z.uuid(),
  operation: z.enum(["cancel", "expire", "retry"]),
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
    .select("id,name,organisation_id,teacher_id,published,active_unit_id,class_units!inner(unit_id,active,archived_at)")
    .eq("id", parsed.data.classId)
    .is("archived_at", null);
  const { data: classData } = await classQuery.single();
  if (!classData || classData.organisation_id !== actor.organisation_id) {
    return { message: "You can only invite students to your own active class." };
  }
  const activeClassUnitIds = classData.class_units
    .filter(unit => unit.active && !unit.archived_at)
    .map(unit => unit.unit_id);
  const [{ data: activeUnit }, { data: journeyTemplate }] = classData.active_unit_id
    ? await Promise.all([
      sessionClient.from("units").select("code,status,archived_at")
        .eq("id", classData.active_unit_id).maybeSingle(),
      sessionClient.from("learning_journey_templates").select("id")
        .eq("unit_id", classData.active_unit_id).eq("status", "approved")
        .is("archived_at", null).limit(1).maybeSingle(),
    ])
    : [{ data: null }, { data: null }];
  const configuredUnitCode = activeUnit
    && activeUnit.status === "approved"
    && !activeUnit.archived_at
    && unitByCode(activeUnit.code)
    ? activeUnit.code
    : null;
  const readiness = classInvitationReadiness({
    published: classData.published,
    activeUnitId: classData.active_unit_id,
    activeClassUnitIds,
    configuredUnitCode,
    hasApprovedJourney: Boolean(journeyTemplate),
  });
  if (!readiness.ready) return { message: readiness.message };

  const origin = resolveAppOrigin({
    configuredOrigin: configuredAppOrigin(),
    requestOrigin: (await headers()).get("origin"),
  });
  if (!origin) return { message: "The public application URL is not configured, so no invitation was sent." };

  const { data: priorInvitation } = await sessionClient.from("student_invitations")
    .select("id,status")
    .eq("class_id", classData.id)
    .eq("email_normalized", parsed.data.email)
    .maybeSingle();

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

  let recoverySent = false;
  let recoveryFailed = false;
  if (result.kind === "connected" && priorInvitation && priorInvitation.status !== "accepted") {
    const recovery = await sendAccountAccessEmail(sessionClient, input, result.invitationId, result.userId);
    recoverySent = recovery.ok;
    recoveryFailed = !recovery.ok;
  }

  await createAdminClient().from("audit_logs").insert({
    organisation_id: actor.organisation_id,
    actor_id: actor.id,
    action: result.kind === "connected" ? "student.connected" : "student.invited",
    entity_type: "student_invitation",
    entity_id: result.invitationId,
    after_data: {
      invited_user_id: result.userId,
      class_id: classData.id,
      outcome: result.kind,
      recovery_sent: recoverySent,
    },
  });
  revalidatePath(`/teacher/classes/${classData.id}`);

  if (result.kind === "connected") {
    if (recoverySent) {
      return { ok: true, message: `${parsed.data.name}'s account is assigned to ${classData.name}, and a new secure password link was sent to ${parsed.data.email}.` };
    }
    if (recoveryFailed) {
      return { ok: true, message: `${parsed.data.name}'s account is assigned to ${classData.name}, but another access email could not be sent yet. Retry shortly.` };
    }
    return { ok: true, message: `${parsed.data.name}'s existing account is now assigned to ${classData.name}. No new email was needed.` };
  }
  return { ok: true, message: `Invitation sent to ${parsed.data.email}. The student can use the secure email link to choose a password and open ${classData.name}.` };
}

export async function manageStudentInvitation(_: InvitationState, formData: FormData): Promise<InvitationState> {
  const parsed = invitationManagement.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "The invitation action was incomplete. Refresh the page and try again." };

  await requireRole("teacher", "administrator");
  const sessionClient = await createClient();
  const { data: selected } = await sessionClient.from("student_invitations")
    .select("id,class_id,email_normalized,display_name,status")
    .eq("id", parsed.data.invitationId)
    .eq("class_id", parsed.data.classId)
    .maybeSingle();
  if (!selected) return { message: "This invitation is not available for this group." };

  if (parsed.data.operation === "retry") {
    if (selected.status === "accepted") return { message: "This student has already joined the group." };
    const retryData = new FormData();
    retryData.set("classId", selected.class_id);
    retryData.set("name", selected.display_name);
    retryData.set("email", selected.email_normalized);
    return inviteStudent({}, retryData);
  }

  const requestedStatus = parsed.data.operation === "cancel" ? "cancelled" : "expired";
  const { error } = await sessionClient.rpc("manage_student_invitation", {
    invitation_uuid: selected.id,
    requested_status: requestedStatus,
  });
  if (error) {
    if (error.message.includes("accepted_invitation_is_final")) {
      return { message: "This student has already joined, so the invitation can no longer be changed." };
    }
    if (error.message.includes("invitation_cannot_expire")) {
      return { message: "Only a preparing or sent invitation can be marked as expired." };
    }
    return { message: "The invitation could not be changed safely. Refresh the page and try again." };
  }
  revalidatePath(`/teacher/classes/${selected.class_id}`);
  return {
    ok: true,
    message: requestedStatus === "cancelled"
      ? `Invitation for ${selected.display_name} cancelled. Its secure link can no longer create class access.`
      : `Invitation for ${selected.display_name} marked as expired. Its secure link can no longer create class access.`,
  };
}

type SessionClient = Awaited<ReturnType<typeof createClient>>;

function createInvitationGateway(sessionClient: SessionClient, actorId: string): InvitationGateway {
  const admin = createAdminClient();
  return {
    async begin(input) {
      const { data: current } = await admin.from("student_invitations")
        .select("id,status")
        .eq("class_id", input.classId)
        .eq("email_normalized", input.email)
        .maybeSingle();
      if (current?.status === "accepted") return { invitationId: current.id as string };

      const record = {
        organisation_id: input.organisationId,
        class_id: input.classId,
        email_normalized: input.email,
        display_name: input.displayName,
        invited_by: input.invitedBy,
        status: "pending",
        last_detail_code: "requested",
        cancelled_at: null,
        expired_at: null,
        updated_at: new Date().toISOString(),
      };
      const query = current
        ? admin.from("student_invitations").update(record).eq("id", current.id)
        : admin.from("student_invitations").insert(record);
      const { data, error } = await query.select("id").single();
      if (error && !current) {
        const { data: raced } = await admin.from("student_invitations")
          .select("id")
          .eq("class_id", input.classId)
          .eq("email_normalized", input.email)
          .maybeSingle();
        if (raced) return { invitationId: raced.id as string };
      }
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
      if (!resolution.profile_exists) {
        return { kind: "recoverable", userId: resolution.user_id as string };
      }
      return { kind: "connectable", userId: resolution.user_id as string };
    },

    async sendNewUserInvite(input) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
        redirectTo: invitationRedirect(input.redirectTo, input.invitationId),
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

    async sendExistingAccountRecovery(input) {
      return sendAccountAccessEmail(sessionClient, input, input.invitationId, input.userId);
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
      if (status === "sent" && ["email_requested", "recovery_requested"].includes(detailCode)) {
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

async function sendAccountAccessEmail(
  sessionClient: SessionClient,
  input: InvitationInput,
  invitationId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; errorCode: string }> {
  const admin = createAdminClient();
  const { data: authData, error: readError } = await admin.auth.admin.getUserById(userId);
  const user = authData.user;
  if (readError || !user || user.email?.trim().toLowerCase() !== input.email) {
    return { ok: false, errorCode: "invalid_auth_account" };
  }
  const { error: metadataError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(user.user_metadata as Record<string, unknown>),
      display_name: input.displayName,
      requested_role: "student",
      invited_class_id: input.classId,
      invited_organisation_id: input.organisationId,
      invitation_id: invitationId,
    },
  });
  if (metadataError) return { ok: false, errorCode: "invalid_auth_account" };

  const { error } = await sessionClient.auth.resetPasswordForEmail(input.email, {
    redirectTo: invitationRedirect(input.redirectTo, invitationId),
  });
  return error ? { ok: false, errorCode: "delivery_failed" } : { ok: true };
}

function invitationRedirect(redirectTo: string, invitationId: string) {
  const url = new URL(redirectTo);
  url.searchParams.set("invitation", invitationId);
  return url.toString();
}
