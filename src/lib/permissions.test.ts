import { describe, expect, it } from "vitest";
import { canJoinClass, canManageCurriculumConfiguration, canPerformAdministratorAction, canPerformTeachingAction, canSetUpOwnedGroup, canSubmitPractice, canViewLearnerEvidence } from "./permissions";

describe("role permissions", () => {
  it("keeps teaching actions away from students", () => {
    expect(canPerformTeachingAction("student")).toBe(false);
    expect(canPerformTeachingAction("teacher")).toBe(true);
    expect(canPerformTeachingAction("administrator")).toBe(true);
  });
  it("only lets learners join and submit practice", () => {
    expect(canJoinClass("student")).toBe(true);
    expect(canJoinClass("teacher")).toBe(false);
    expect(canSubmitPractice("student")).toBe(true);
    expect(canSubmitPractice("administrator")).toBe(false);
  });
  it("limits learner evidence to authorised staff roles at the app boundary", () => {
    expect(canViewLearnerEvidence("student")).toBe(false);
    expect(canViewLearnerEvidence("teacher")).toBe(true);
    expect(canViewLearnerEvidence("administrator")).toBe(true);
  });
  it("keeps curriculum authoring and approval in administrator mode", () => {
    expect(canManageCurriculumConfiguration("student")).toBe(false);
    expect(canManageCurriculumConfiguration("teacher")).toBe(false);
    expect(canManageCurriculumConfiguration("administrator")).toBe(true);
  });
  it("separates owned-group setup from advanced group administration", () => {
    expect(canSetUpOwnedGroup("student")).toBe(false);
    expect(canSetUpOwnedGroup("teacher")).toBe(true);
    expect(canSetUpOwnedGroup("administrator")).toBe(true);
    expect(canPerformAdministratorAction("student")).toBe(false);
    expect(canPerformAdministratorAction("teacher")).toBe(false);
    expect(canPerformAdministratorAction("administrator")).toBe(true);
  });
});
