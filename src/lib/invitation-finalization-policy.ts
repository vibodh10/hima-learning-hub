import { z } from "zod";

export type ExistingInvitationProfile = {
  role: "student" | "teacher" | "administrator";
  archived_at: string | null;
};

export type DurableInvitationProvisioningRecord = {
  class_id: string;
  organisation_id: string;
  display_name: string;
};

export type UntrustedInvitationMetadata = {
  invited_class_id?: unknown;
  invited_organisation_id?: unknown;
  display_name?: unknown;
};

/**
 * Invitation metadata used before the durable invitation ledger was added can
 * remain on an Auth account after its profile has been provisioned or its role
 * has changed. An established active profile is authoritative when there is no
 * matching durable invitation, so stale metadata must not block sign-in.
 */
export function canIgnoreLegacyInvitationMetadata(
  profile: ExistingInvitationProfile | null,
  hasDurableInvitation: boolean,
) {
  return Boolean(profile && !profile.archived_at && !hasDurableInvitation);
}

/** Only a delivered invitation (or an already accepted one) may provision. */
export function invitationAcceptanceBlock(status: string | null | undefined) {
  if (status === "sent" || status === "accepted") return null;
  if (status === "cancelled") return "invitation_cancelled";
  if (status === "expired") return "invitation_expired";
  if (status === "pending") return "invitation_not_sent";
  return "invitation_inactive";
}

/**
 * Auth user metadata is editable by its account holder and may only help find
 * a durable invitation. It can never supply enrolment or profile attributes.
 */
export function invitationProvisioningDetails(
  invitation: DurableInvitationProvisioningRecord | null,
  untrustedMetadata: UntrustedInvitationMetadata,
) {
  void untrustedMetadata;
  if (!invitation) return null;
  return {
    classId: invitation.class_id,
    organisationId: invitation.organisation_id,
    displayName: invitation.display_name.trim(),
  };
}

const storedGuid = z.guid();

/**
 * PostgreSQL accepts UUID-shaped identifiers without requiring an RFC version
 * nibble. The hosted curriculum uses fixed version-0 organisation IDs, so
 * strict `z.uuid()` validation would reject a genuine durable database row.
 */
export function validStoredGuid(value: unknown) {
  const parsed = storedGuid.safeParse(value);
  return parsed.success ? parsed.data : null;
}
