import { describe, expect, it } from "vitest";
import { evidenceCsv, inspectionEvidenceCsv, learnerJourneyCsv, targetStatus } from "./report";

describe("learner evidence CSV", () => {
  it("exports factual practice and target rows with safe CSV quoting", () => {
    const csv = evidenceCsv(
      [{ completed_at: "2026-10-01", title: 'Firewall, "core"', percentage: 80, pathway: "Stretch" }],
      [{ created_at: "2026-10-01", target_text: "Complete review", status: "active" }],
    );
    expect(csv).toContain('"Firewall, ""core"""');
    expect(csv).toContain('"80%"');
    expect(csv).toContain('"Target","Complete review"');
  });

  it("exports the learner identity, starting point, progress achieved, targets, outcomes and deadlines", () => {
    const csv = inspectionEvidenceCsv({
      learnerName: "Sam Learner",
      className: "BTEC IT 2026",
      courseTitle: "Pearson BTEC Level 3 National IT",
      generatedAt: "2026-07-29T12:00:00.000Z",
      comparisons: [{
        skill: "Python variables",
        startingPercentage: 40,
        startingQuestionCount: 4,
        startingSufficient: true,
        latestPercentage: 75,
        progressQuestionCount: 4,
        progressSufficient: true,
        improvementPoints: 35,
        status: "Significant Improvement",
      }],
      targets: [{
        target_text: "Complete equivalent Python review independently",
        status: "achieved",
        starts_on: "2026-07-01",
        target_date: "2026-07-28",
        review_on: "2026-07-29",
        reason: "Starting-point gap in variable assignment",
        success_measure: "At least 70% without hints",
        current_progress: 100,
        review_result: "75% achieved independently",
        final_outcome: "Target achieved",
        next_action: "Move to selection",
        created_at: "2026-07-01",
        skills: [{ title: "Python variables" }],
      }],
      attempts: [{
        completed_at: "2026-07-28",
        title: "Python progress check",
        percentage: 75,
        pathway: "Core",
      }],
    });
    expect(csv).toContain('"Sam Learner"');
    expect(csv).toContain('"Starting point and progress achieved"');
    expect(csv).toContain('"40% (4 equivalent questions)"');
    expect(csv).toContain('"+35 percentage points"');
    expect(csv).toContain('"Targets, outcomes and deadlines"');
    expect(csv).toContain('"Achieved","2026-07-01","2026-07-28","2026-07-29"');
    expect(csv).toContain('"At least 70% without hints"');
    expect(csv).toContain('"Target achieved"');
  });

  it("does not present a one-question response as a secure starting point", () => {
    const csv = inspectionEvidenceCsv({
      learnerName: "Sam",
      className: "Class",
      courseTitle: "Course",
      generatedAt: "2026-07-29T12:00:00.000Z",
      comparisons: [{
        skill: "Variables",
        startingPercentage: 100,
        startingQuestionCount: 1,
        startingSufficient: false,
        latestPercentage: null,
        progressQuestionCount: 0,
        progressSufficient: false,
        improvementPoints: null,
        status: "Insufficient Evidence",
      }],
      targets: [],
      attempts: [],
    });
    expect(csv).toContain('"Insufficient evidence (1 question; recorded response 100%)"');
    expect(csv).toContain('"Not yet calculable - insufficient comparable evidence"');
  });

  it("distinguishes overdue, current and achieved targets as at the report date", () => {
    const asAt = new Date("2026-07-29T12:00:00Z");
    expect(targetStatus({ status: "active", target_date: "2026-07-28" }, asAt)).toBe("Overdue");
    expect(targetStatus({ status: "extended", target_date: "2026-08-10" }, asAt)).toBe("In progress");
    expect(targetStatus({ status: "achieved", target_date: "2026-07-01" }, asAt)).toBe("Achieved");
    expect(targetStatus({ status: "partially_achieved", target_date: "2026-07-01" }, asAt)).toBe("Partially achieved");
  });

  it("exports the required topic, feedback, action, target and review columns", () => {
    const csv = learnerJourneyCsv({
      learnerName: "Sam", className: "IT", courseTitle: "BTEC IT",
      generatedAt: "2026-07-29T12:00:00Z",
      rows: [{
        unit: "Unit 4", topic: "Variables", skill: "Data types",
        evidenceType: "Comparable assessment", startingPointResult: "40%",
        startingPointDate: "2026-07-01", progressPointResult: "80%",
        progressPointDate: "2026-07-20", supportOrHintsUsed: "No hints",
        change: "+40 percentage points", feedback: "Explain type choice",
        learnerAction: "Completed independent review",
        improvementAfterFeedback: "+40 percentage points",
        target: "Achieve 70% without hints", deadline: "2026-08-12",
        reviewDate: "2026-08-13", status: "Active",
      }],
    });
    expect(csv).toContain('"Unit","Topic","Skill","Evidence type"');
    expect(csv).toContain('"Feedback","Learner action","Improvement after feedback"');
    expect(csv).toContain('"Target","Deadline","Review date","Status"');
    expect(csv).toContain('"Unit 4","Variables","Data types","Comparable assessment"');
  });
});
