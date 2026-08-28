export type ClassInvitationReadinessInput = {
  published: boolean;
  activeUnitId: string | null;
  activeClassUnitIds: string[];
  configuredUnitCode: string | null;
  hasApprovedJourney: boolean;
};

export type ClassInvitationReadiness =
  | { ready: true }
  | { ready: false; message: string };

export function classInvitationReadiness(
  input: ClassInvitationReadinessInput,
): ClassInvitationReadiness {
  if (!input.published || input.activeClassUnitIds.length === 0) {
    return {
      ready: false,
      message: "Choose and publish at least one unit before inviting students.",
    };
  }

  if (!input.activeUnitId || !input.activeClassUnitIds.includes(input.activeUnitId)) {
    return {
      ready: false,
      message: "Choose the group's current unit before inviting students.",
    };
  }

  if (!input.configuredUnitCode || !input.hasApprovedJourney) {
    return {
      ready: false,
      message: "This group's current unit is not release-ready, so no invitation was sent.",
    };
  }

  return { ready: true };
}
