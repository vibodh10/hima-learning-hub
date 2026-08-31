import "server-only";
import {
  canIgnoreLegacyInvitationMetadata,
  invitationAcceptanceBlock,
  invitationProvisioningDetails,
  validStoredGuid,
} from "@/lib/invitation-finalization-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type InvitationFinalizationResult =
  | { kind: "ready"; classId?: string }
  | { kind: "not_invited" }
  | { kind: "failed"; code: string };

/**
 * Completes the durable, idempotent part of invitation acceptance. This is
 * called after either OTP verification or a successful sign-in so a transient
 * provisioning failure cannot strand an invited student.
 */
export async function finalizeCurrentStudentInvitation(
  preferredInvitationId?: unknown,
): Promise<InvitationFinalizationResult> {
  const session = await createClient();
  const { data: { user }, error: userError } = await session.auth.getUser();
  if (userError || !user?.email) return { kind: "failed", code: "missing_session" };

  const admin = createAdminClient();
  const metadata = user.user_metadata as Record<string, unknown>;
  const metadataInvitationId = validStoredGuid(preferredInvitationId) ?? validStoredGuid(metadata.invitation_id);

  const invitationQuery = admin.from("student_invitations")
    .select("id,class_id,organisation_id,email_normalized,display_name,status,auth_user_id")
    .limit(1);
  const { data: invitation } = metadataInvitationId
    ? await invitationQuery.eq("id", metadataInvitationId).maybeSingle()
    : await invitationQuery.eq("auth_user_id", user.id).order("invited_at", { ascending: false }).maybeSingle();

  const { data: existingProfile, error: profileReadError } = await admin.from("user_profiles")
    .select("id,organisation_id,role,archived_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profileReadError) return { kind: "failed", code: "profile_lookup_failed" };

  if (invitation) {
    const acceptanceBlock = invitationAcceptanceBlock(invitation.status);
    if (acceptanceBlock) return { kind: "failed", code: acceptanceBlock };
    if (invitation.auth_user_id && invitation.auth_user_id !== user.id) {
      return { kind: "failed", code: "invitation_account_mismatch" };
    }
  }

  if (canIgnoreLegacyInvitationMetadata(existingProfile, Boolean(invitation))) {
    return { kind: "ready" };
  }

  if (!invitation) {
    return existingProfile
      ? { kind: "failed", code: "profile_conflict" }
      : { kind: "not_invited" };
  }

  const provisioning = invitationProvisioningDetails(invitation, metadata);
  if (!provisioning) return { kind: "not_invited" };
  const classId = validStoredGuid(provisioning.classId);
  const expectedOrganisationId = validStoredGuid(provisioning.organisationId);
  if (!classId || !expectedOrganisationId) return { kind: "failed", code: "invalid_invitation" };

  const { data: classData, error: classError } = await admin.from("classes")
    .select("id,organisation_id,archived_at")
    .eq("id", classId)
    .maybeSingle();
  if (classError || !classData || classData.archived_at) return { kind: "failed", code: "invalid_class" };
  if (classData.organisation_id !== expectedOrganisationId) {
    return { kind: "failed", code: "organisation_mismatch" };
  }
  if (invitation?.email_normalized && invitation.email_normalized !== user.email.trim().toLowerCase()) {
    return { kind: "failed", code: "email_mismatch" };
  }
  if (existingProfile && (
    existingProfile.organisation_id !== classData.organisation_id
    || existingProfile.role !== "student"
    || existingProfile.archived_at
  )) return { kind: "failed", code: "profile_conflict" };

  const { data: existingEnrolment, error: enrolmentReadError } = await admin.from("enrolments")
    .select("id,archived_at")
    .eq("class_id", classData.id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (enrolmentReadError) return { kind: "failed", code: "enrolment_lookup_failed" };
  if (existingProfile && existingEnrolment && !existingEnrolment.archived_at && (!invitation || invitation.status === "accepted")) {
    return { kind: "ready", classId: classData.id };
  }

  if (!existingProfile) {
    const displayName = provisioning.displayName;
    if (displayName.length < 2) return { kind: "failed", code: "missing_display_name" };
    const { error } = await admin.from("user_profiles").insert({
      id: user.id,
      organisation_id: classData.organisation_id,
      role: "student",
      display_name: displayName,
    });
    if (error) return { kind: "failed", code: "profile_create_failed" };
  }

  const { error: enrolmentError } = await admin.from("enrolments").upsert({
    class_id: classData.id,
    student_id: user.id,
    archived_at: null,
  }, { onConflict: "class_id,student_id" });
  if (enrolmentError) return { kind: "failed", code: "enrolment_failed" };

  if (invitation?.id) {
    const acceptedAt = new Date().toISOString();
    await admin.from("student_invitations").update({
      auth_user_id: user.id,
      status: "accepted",
      accepted_at: acceptedAt,
      updated_at: acceptedAt,
      last_detail_code: "student_authenticated",
    }).eq("id", invitation.id);
    await admin.from("student_invitation_events").insert({
      invitation_id: invitation.id,
      actor_id: user.id,
      status: "accepted",
      detail_code: "student_authenticated",
    });
  }

  await admin.from("audit_logs").insert({
    organisation_id: classData.organisation_id,
    actor_id: user.id,
    action: "student.invitation_accepted",
    entity_type: "student_invitation",
    entity_id: invitation?.id ?? null,
    after_data: { invited_user_id: user.id, class_id: classData.id },
  });
  return { kind: "ready", classId: classData.id };
}
