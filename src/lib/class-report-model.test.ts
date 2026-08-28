import { describe, expect, it } from "vitest";
import { classReportCsv, projectClassReport, type ClassReportInput } from "./class-report-model";

const input: ClassReportInput = {
  className: "Level 2 Digital",
  courseTitle: "Digital Information Technology",
  units: ["Unit 4: Programming"],
  generatedAt: "2026-08-27T12:00:00.000Z",
  learners: [{ id: "learner-1", name: "Alex Learner" }],
  comparisons: [],
  mastery: [],
  allocations: [],
  attempts: [],
  misconceptions: [],
  actions: [],
};

describe("projectClassReport", () => {
  it("keeps absent and insufficient assessment evidence explicit", () => {
    const report = projectClassReport({
      ...input,
      comparisons: [{
        learnerId: "learner-1", startingPercentage: 75, latestPercentage: 90,
        improvementPoints: 15, progressDate: null,
        evidence: { starting_sufficient: false, progress_sufficient: true },
      }],
    });

    expect(report.rows[0]).toMatchObject({
      starting: null, latest: null, improvement: null, comparableSkills: 0,
    });
  });

  it("uses only sufficient starting and dated comparable evidence", () => {
    const report = projectClassReport({
      ...input,
      comparisons: [
        {
          learnerId: "learner-1", startingPercentage: 50, latestPercentage: 70,
          improvementPoints: 20, progressDate: "2026-08-20T09:00:00Z",
          evidence: { starting_sufficient: true, progress_sufficient: true },
        },
        {
          learnerId: "learner-1", startingPercentage: 90, latestPercentage: 100,
          improvementPoints: 10, progressDate: null,
          evidence: { starting_sufficient: true, progress_sufficient: true },
        },
      ],
    });

    expect(report.rows[0]).toMatchObject({
      starting: 70, latest: 70, improvement: 20, comparableSkills: 1,
    });
  });

  it("counts only applicable allocations and does not reuse another allocation's attempt", () => {
    const report = projectClassReport({
      ...input,
      allocations: [
        { id: "class-work", learnerId: null, activityId: "activity-1", releaseAt: "2026-08-01", deadlineAt: "2026-08-20", required: true },
        { id: "alex-work", learnerId: "learner-1", activityId: "activity-2", releaseAt: null, deadlineAt: "2026-09-01", required: true },
        { id: "other-work", learnerId: "learner-2", activityId: "activity-3", releaseAt: null, deadlineAt: "2026-08-10", required: true },
      ],
      attempts: [
        { learnerId: "learner-1", activityId: "activity-1", allocationId: "different-allocation", completedAt: "2026-08-10" },
        { learnerId: "learner-1", activityId: "activity-2", allocationId: "alex-work", completedAt: "2026-08-15" },
      ],
    });

    expect(report.rows[0]).toMatchObject({
      allocatedCompleted: 1, allocatedTotal: 2, overdueRequired: 1,
    });
  });

  it("uses one legacy unlinked attempt for at most one repeated allocation", () => {
    const report = projectClassReport({
      ...input,
      allocations: [
        { id: "first", learnerId: null, activityId: "activity-1", releaseAt: "2026-08-01", deadlineAt: null, required: true },
        { id: "second", learnerId: null, activityId: "activity-1", releaseAt: "2026-08-10", deadlineAt: null, required: true },
      ],
      attempts: [{
        learnerId: "learner-1", activityId: "activity-1", allocationId: null,
        completedAt: "2026-08-15T10:00:00.000Z",
      }],
    });

    expect(report.rows[0]).toMatchObject({ allocatedCompleted: 1, allocatedTotal: 2 });
  });

  it("does not use an unlinked attempt to satisfy a new explicitly scoped allocation", () => {
    const report = projectClassReport({
      ...input,
      allocations: [{
        id: "exact", learnerId: "learner-1", activityId: "activity-1",
        releaseAt: "2026-08-01", deadlineAt: "2026-08-20", required: true,
        classScopeSource: "explicit",
      }],
      attempts: [{
        learnerId: "learner-1", activityId: "activity-1", allocationId: null,
        completedAt: "2026-08-15T10:00:00.000Z",
      }],
    });

    expect(report.rows[0]).toMatchObject({
      allocatedCompleted: 0, allocatedTotal: 1, overdueRequired: 1,
    });
  });

  it("aggregates common misconceptions by affected learners", () => {
    const report = projectClassReport({
      ...input,
      learners: [{ id: "learner-1", name: "Alex" }, { id: "learner-2", name: "Beth" }],
      misconceptions: [
        { learnerId: "learner-1", title: "Loop boundary", occurrenceCount: 2 },
        { learnerId: "learner-2", title: "Loop boundary", occurrenceCount: 1 },
      ],
    });

    expect(report.misconceptions).toEqual([
      { title: "Loop boundary", occurrenceCount: 3, learnerCount: 2 },
    ]);
  });

  it("escapes spreadsheet cells safely", () => {
    const csv = classReportCsv(projectClassReport({ ...input, className: "A \"quoted\" class" }));
    expect(csv).toContain('"A ""quoted"" class"');
    expect(csv).toContain('"Not yet recorded"');
  });
});
