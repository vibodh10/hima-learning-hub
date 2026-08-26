import { describe, expect, it } from "vitest";
import { summariseTeacherOverview } from "./dashboard-summary";

describe("teacher overview summary", () => {
  it("returns genuine zeroes when there are no enrolments or results", () => {
    expect(summariseTeacherOverview({
      enrolmentLearnerIds: [],
      completedAssessmentLearnerIds: [],
      attentionStatuses: [],
    })).toEqual({ students: 0, activeEnrolments: 0, completedAssessments: 0, needAttention: 0 });
  });

  it("counts unique students, active enrolments and database evidence separately", () => {
    expect(summariseTeacherOverview({
      enrolmentLearnerIds: ["student-a", "student-a", "student-b"],
      completedAssessmentLearnerIds: ["student-a", "student-a", "not-enrolled"],
      attentionStatuses: ["on_track", "action_required", "catch_up_required"],
    })).toEqual({ students: 2, activeEnrolments: 3, completedAssessments: 2, needAttention: 2 });
  });
});
