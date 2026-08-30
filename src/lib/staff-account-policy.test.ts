import { describe, expect, it } from "vitest";
import { canReuseTeacherProfile, type ExistingStaffProfile } from "./staff-account-policy";

const teacher: ExistingStaffProfile = {
  organisation_id: "org-1",
  role: "teacher",
  display_name: "Himabindu Gunde",
  archived_at: null,
};

describe("existing teacher account reuse", () => {
  it("allows an exact active teacher match", () => {
    expect(canReuseTeacherProfile(teacher, "org-1", "Himabindu Gunde")).toBe(true);
  });

  it.each([
    [null, "org-1", "Himabindu Gunde"],
    [{ ...teacher, organisation_id: "org-2" }, "org-1", "Himabindu Gunde"],
    [{ ...teacher, role: "administrator" as const }, "org-1", "Himabindu Gunde"],
    [{ ...teacher, archived_at: "2026-08-30T12:00:00.000Z" }, "org-1", "Himabindu Gunde"],
    [{ ...teacher, display_name: "Another Tutor" }, "org-1", "Himabindu Gunde"],
  ])("rejects a conflicting existing profile", (profile, organisationId, requestedName) => {
    expect(canReuseTeacherProfile(profile, organisationId, requestedName)).toBe(false);
  });
});
