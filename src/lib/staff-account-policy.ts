export type ExistingStaffProfile = {
  organisation_id: string;
  role: "student" | "teacher" | "administrator";
  display_name: string;
  archived_at: string | null;
};

export function canReuseTeacherProfile(
  profile: ExistingStaffProfile | null,
  organisationId: string,
  requestedName: string,
) {
  return Boolean(
    profile
    && profile.organisation_id === organisationId
    && profile.role === "teacher"
    && !profile.archived_at
    && profile.display_name.trim() === requestedName.trim(),
  );
}
