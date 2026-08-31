import { describe, expect, it } from "vitest";
import {
  learnerReportDateRangeLabel,
  parseLearnerReportDateRange,
  scopeLearnerEvidenceToDateRange,
} from "./learner-report-date-range";

function evidence() {
  return {
    comparisons: [
      { skill_id: "inside", progress_result: { created_at: "2026-10-15T09:00:00Z" } },
      { skill_id: "outside", progress_result: { created_at: "2027-01-15T09:00:00Z" } },
    ],
    mastery: [{ skill_id: "current-total" }],
    attempts: [
      { id: "inside", completed_at: "2026-10-01T00:00:00Z" },
      { id: "outside", completed_at: "2026-12-01T00:00:00Z" },
    ],
    targets: [
      { id: "overlaps", starts_on: "2026-09-01", review_on: "2026-11-15" },
      { id: "later", starts_on: "2027-01-01", review_on: "2027-02-01" },
    ],
    feedback: [], misconceptions: [], teacherActions: [], snapshots: [], retrieval: [],
    badges: [], coins: [], assessments: [], overrides: [], curriculumAttempts: [],
    achievement: { ap_total: 20 }, portfolioArtifacts: [], worksheets: [], catchUpRecords: [],
    recognitions: [], attendanceEvents: [], certificateReviews: [],
    workbookProgress: [{
      unit_code: "6", topic_code: "A1", evidence: [
        { id: "inside", recordedAt: "2026-10-20T09:00:00Z" },
        { id: "outside", recordedAt: "2027-01-20T09:00:00Z" },
      ],
    }],
  };
}

describe("learner report date ranges", () => {
  it("accepts an inclusive reporting window and rejects reversed dates", () => {
    const parsed = parseLearnerReportDateRange(new URLSearchParams("from=2026-09-01&to=2026-11-30"));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(learnerReportDateRangeLabel(parsed.range, "2026-12-03T12:00:00Z"))
        .toBe("01/09/2026 to 30/11/2026 (inclusive)");
    }
    expect(parseLearnerReportDateRange(new URLSearchParams("from=2026-11-30&to=2026-09-01")))
      .toEqual({ ok: false, message: "The report start date must be on or before the end date." });
  });

  it("keeps only dated evidence in the selected window and omits current aggregates", () => {
    const parsed = parseLearnerReportDateRange(new URLSearchParams("from=2026-09-01&to=2026-11-30"));
    if (!parsed.ok) throw new Error(parsed.message);
    const scoped = scopeLearnerEvidenceToDateRange(evidence(), parsed.range);
    expect(scoped.comparisons.map(row => row.skill_id)).toEqual(["inside"]);
    expect(scoped.attempts.map(row => row.id)).toEqual(["inside"]);
    expect(scoped.targets.map(row => row.id)).toEqual(["overlaps"]);
    expect(scoped.mastery).toEqual([]);
    expect(scoped.achievement).toBeUndefined();
    expect(scoped.workbookProgress).toEqual([expect.objectContaining({
      evidence: [{ id: "inside", recordedAt: "2026-10-20T09:00:00Z" }],
    })]);
  });
});
