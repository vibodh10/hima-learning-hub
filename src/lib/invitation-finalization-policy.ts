export type ExistingInvitationProfile = {
  role: "student" | "teacher" | "administrator";
  archived_at: string | null;
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
