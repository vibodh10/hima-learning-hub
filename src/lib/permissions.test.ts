import { describe, expect, it } from "vitest";
import { canCreateClass, canJoinClass, canManageCurriculumConfiguration, canManageGroupConfiguration, canSubmitPractice, canViewLearnerEvidence } from "./permissions";

describe("role permissions", () => {
  it("keeps class administration away from students", () => {
    expect(canCreateClass("student")).toBe(false);
    expect(canCreateClass("teacher")).toBe(true);
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
  it("lets teaching staff configure their own groups while keeping students out", () => {
    expect(canManageGroupConfiguration("student")).toBe(false);
    expect(canManageGroupConfiguration("teacher")).toBe(true);
    expect(canManageGroupConfiguration("administrator")).toBe(true);
  });
});
