import { describe, expect, it } from "vitest";
import { scopedTeacherAttention, selectTeacherDashboardLearners } from "./teacher-dashboard-filters";

const base = {
  baseLearnerIds: ["a", "b", "c"],
  studentId: undefined,
  masteryFilterActive: false,
  masteryLearnerIds: [],
  attemptFilterActive: false,
  attemptLearnerIds: [],
  activityFilterActive: false,
  activityLearnerIds: [],
  completionFilterActive: false,
  completionLearnerIds: [],
};

describe("teacher dashboard learner filters", () => {
  it("retains every learner when no learner-level filter is active", () => {
    expect([...selectTeacherDashboardLearners(base)]).toEqual(["a", "b", "c"]);
  });

  it("applies student, curriculum, period and completion filters as an intersection", () => {
    const selected = selectTeacherDashboardLearners({
      ...base,
      studentId: "b",
      masteryFilterActive: true,
      masteryLearnerIds: ["a", "b"],
      attemptFilterActive: true,
      attemptLearnerIds: ["b", "c"],
      completionFilterActive: true,
      completionLearnerIds: ["b"],
    });
    expect([...selected]).toEqual(["b"]);
  });

  it("does not leak a learner from outside the selected classes", () => {
    const selected = selectTeacherDashboardLearners({
      ...base,
      baseLearnerIds: ["a"],
      activityFilterActive: true,
      activityLearnerIds: ["a", "outside"],
    });
    expect([...selected]).toEqual(["a"]);
  });

  it("uses scoped evidence without hiding existing catch-up or intervention risk", () => {
    expect(scopedTeacherAttention({baseStatus:"on_track",baseReason:"",catchUpStatus:"complete",outstandingCount:0,currentScore:null}).status).toBe("action_required");
    expect(scopedTeacherAttention({baseStatus:"on_track",baseReason:"",catchUpStatus:"complete",outstandingCount:0,currentScore:91}).status).toBe("exceeding");
    expect(scopedTeacherAttention({baseStatus:"intervention_required",baseReason:"Open intervention",catchUpStatus:"complete",outstandingCount:0,currentScore:91})).toEqual({status:"intervention_required",reason:"Open intervention"});
  });
});
