import { describe, expect, it } from "vitest";
import { classUnitReportCsv, projectClassUnitReport, type ClassUnitReportInput } from "./class-unit-report";

const base: ClassUnitReportInput = {
  className: "Group A",
  courseTitle: "BTEC IT",
  unitId: "40000000-0000-0000-0000-000000000004",
  unitCode: "4",
  unitTitle: "Programming",
  generatedAt: "2026-08-27T12:00:00.000Z",
  journey: { title: "Programming — 12 teaching weeks", status: "in progress", teachingWeek: 3, totalTeachingWeeks: 12, startedOn: "2026-08-10" },
  learners: [{ id: "student-1", name: "Sam Learner" }],
  topics: [
    { id: "topic-1", code: "A1", title: "Computational thinking" },
    { id: "topic-2", code: "A2–A3", title: "Programming principles" },
  ],
  progress: [], attempts: [], comparisons: [], targets: [], decisions: [], artifacts: [], worksheets: [], catchUp: [],
};

describe("class unit evidence report", () => {
  it("preserves missing evidence rather than manufacturing progress", () => {
    const report = projectClassUnitReport(base);
    expect(report.rows[0]).toMatchObject({
      startingPoint: "Not yet recorded",
      modulesStarted: 0,
      modulesCompleted: 0,
      unitProgress: 0,
      currentModule: "Not started",
      latestAssessment: "Not yet recorded",
      comparableProgress: "Not yet calculable — insufficient comparable evidence",
      attention: "Starting point not yet established",
      nextStep: "Complete the unit starting-point assessment",
    });
  });

  it("derives secure progress, feedback response, attention and next steps from stored unit evidence", () => {
    const report = projectClassUnitReport({
      ...base,
      progress: [
        {
          learnerId: "student-1", topicCode: "A1", topicStartedAt: "2026-08-10T09:00:00Z",
          lessonCompletedAt: "2026-08-11T09:00:00Z", currentSection: "mastery", practiceScore: 84,
          masteryScore: 86, independentAttempts: 3, masteredAt: "2026-08-12T09:00:00Z",
          evidence: [
            { kind: "initial_diagnostic", independent: true, correct: false },
            { kind: "initial_diagnostic", independent: true, correct: true },
            { kind: "initial_diagnostic", independent: true, correct: true },
          ], updatedAt: "2026-08-12T09:00:00Z",
        },
        {
          learnerId: "student-1", topicCode: "A2–A3", topicStartedAt: "2026-08-20T09:00:00Z",
          lessonCompletedAt: null, currentSection: "lesson:2", practiceScore: null,
          masteryScore: null, independentAttempts: 0, masteredAt: null, evidence: [],
          updatedAt: "2026-08-20T09:00:00Z",
        },
      ],
      attempts: [
        { id: "a1", learnerId: "student-1", kind: "topic_practice", topicCode: "A2–A3", paperMode: null, percentage: 45, hintsUsed: 1, completedAt: "2026-08-20T10:00:00Z", teacherFeedback: "Revisit selection tracing." },
        { id: "a2", learnerId: "student-1", kind: "topic_practice", topicCode: "A2–A3", paperMode: null, percentage: 55, hintsUsed: 0, completedAt: "2026-08-21T10:00:00Z", teacherFeedback: null },
      ],
      targets: [{ learnerId: "student-1", status: "active", targetText: "Trace selection accurately", targetDate: "2026-08-20", nextAction: "Complete a fresh selection trace" }],
      decisions: [{ learnerId: "student-1", topicCode: "A2–A3", decisionType: "intervention", reason: "Two low independent attempts", reviewOn: "2026-08-30", createdAt: "2026-08-22T10:00:00Z" }],
      artifacts: [{ learnerId: "student-1" }],
      worksheets: [{ learnerId: "student-1" }],
      catchUp: [],
    });
    expect(report.rows[0]).toMatchObject({
      startingPoint: "66.7% (3 diagnostic responses)",
      modulesStarted: 2,
      modulesCompleted: 1,
      unitProgress: 50,
      currentModule: "A2–A3: Programming principles",
      currentSection: "lesson:2",
      reviewedFeedback: 1,
      feedbackResponse: "+10 percentage points across 1 follow-up cycle",
      overdueTargets: 1,
      attention: "Needs attention — 1 overdue target",
      nextStep: "Complete a fresh selection trace",
      teacherDecisions: 1,
      portfolioArtifacts: 1,
      worksheets: 1,
    });
  });

  it("requires sufficient comparable evidence before reporting improvement", () => {
    const report = projectClassUnitReport({
      ...base,
      comparisons: [{
        learnerId: "student-1", startingPercentage: 40, latestPercentage: 90,
        improvementPoints: 50, progressDate: "2026-08-25",
        evidence: { starting_question_count: 1, progress_question_count: 1, starting_sufficient: false, progress_sufficient: false },
      }],
    });
    expect(report.rows[0].startingPoint).toBe("Not yet recorded");
    expect(report.rows[0].comparableProgress).toContain("insufficient comparable evidence");
  });

  it("exports the required unit, evidence, attention and next-step columns safely", () => {
    const report = projectClassUnitReport({ ...base, learners: [{ id: "student-1", name: 'Sam, "Learner"' }] });
    const csv = classUnitReportCsv(report);
    expect(csv).toContain('"Unit","4: Programming"');
    expect(csv).toContain('"Starting point","Modules started","Modules secure"');
    expect(csv).toContain('"Response after feedback","Portfolio evidence","Worksheets"');
    expect(csv).toContain('"Attention","Next step"');
    expect(csv).toContain('"Sam, ""Learner"""');
  });
});
