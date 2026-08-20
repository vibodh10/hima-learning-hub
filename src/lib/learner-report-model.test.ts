import { describe, expect, it } from "vitest";
import {
  academicEvidenceLabel, conciseCurrentJudgement, decliningEvidence, groupByTopic, hasValidComparableProgress,
  improvementAfterFeedback, isPriorExperienceSkill, learnerReflectionLabel, reportTargetStatus,
  topicAssessmentStatus,
} from "./learner-report-model";

describe("individual learner report accuracy rules", () => {
  it("keeps partial and one-question starting points as insufficient evidence", () => {
    expect(hasValidComparableProgress({
      latestPercentage: null, improvementPoints: null,
      evidence: { starting_question_count: 1, starting_sufficient: false, progress_sufficient: false },
      progressDate: null,
    })).toBe(false);
    expect(academicEvidenceLabel({ attemptsCount: 1, hintsUsed: 0, masteryScore: 100, retrievalScore: null }))
      .toBe("Insufficient evidence");
    expect(conciseCurrentJudgement({
      startingQuestionCount: 1, startingSufficient: false,
      progressSufficient: false, validComparableProgress: false, hintsUsed: 0,
    })).toBe("Initial indication — limited evidence");
  });

  it("requires sufficient, dated, comparable progress evidence", () => {
    const evidence = { starting_sufficient: true, progress_sufficient: true };
    expect(hasValidComparableProgress({
      latestPercentage: 80, improvementPoints: 30, evidence, progressDate: "2026-08-10",
    })).toBe(true);
    expect(hasValidComparableProgress({
      latestPercentage: 80, improvementPoints: 30, evidence, progressDate: null,
    })).toBe(false);
  });

  it("distinguishes supported and independent work", () => {
    expect(academicEvidenceLabel({ attemptsCount: 3, hintsUsed: 2, masteryScore: 80, retrievalScore: null }))
      .toBe("Developing with support");
    expect(academicEvidenceLabel({ attemptsCount: 3, hintsUsed: 0, masteryScore: 80, retrievalScore: null }))
      .toBe("Independent practice evidence");
    expect(academicEvidenceLabel({ attemptsCount: 3, hintsUsed: 0, masteryScore: 80, retrievalScore: 85 }))
      .toBe("Sustained mastery");
  });

  it("does not treat no-hint limited evidence as supported work", () => {
    expect(conciseCurrentJudgement({
      startingQuestionCount: 1, startingSufficient: false,
      progressSufficient: false, validComparableProgress: false, hintsUsed: 0,
    })).not.toContain("support");
    expect(conciseCurrentJudgement({
      startingQuestionCount: 4, startingSufficient: true,
      progressSufficient: true, validComparableProgress: true, hintsUsed: 0,
      latestPercentage: 80,
    })).toBe("Independently demonstrated");
  });

  it("assigns one unambiguous status to each topic", () => {
    expect(topicAssessmentStatus({ sampledSkills: 0, totalSkills: 6, secureBaselineSkills: 0, completedProgressSkills: 0 })).toBe("Not started");
    expect(topicAssessmentStatus({ sampledSkills: 6, totalSkills: 6, secureBaselineSkills: 0, completedProgressSkills: 0 })).toBe("Partially assessed");
    expect(topicAssessmentStatus({ sampledSkills: 6, totalSkills: 6, secureBaselineSkills: 6, completedProgressSkills: 0 })).toBe("Baseline established");
    expect(topicAssessmentStatus({ sampledSkills: 6, totalSkills: 6, secureBaselineSkills: 6, completedProgressSkills: 2 })).toBe("Progress point completed");
  });

  it("separates self-reported prior experience from academic mastery", () => {
    expect(isPriorExperienceSkill("Programming experience")).toBe(true);
    expect(isPriorExperienceSkill("Create and update variables")).toBe(false);
  });

  it("only claims improvement after feedback when follow-up evidence exists", () => {
    expect(improvementAfterFeedback({ originalResult: 40, followUpResult: 80, feedback: "Retry independently" }))
      .toBe(40);
    expect(improvementAfterFeedback({ originalResult: 40, followUpResult: null, feedback: "Retry independently" }))
      .toBeNull();
  });

  it("does not invent a missing learner reflection", () => {
    expect(learnerReflectionLabel(null)).toBe("Learner reflection not yet provided.");
    expect(learnerReflectionLabel("I now check the data type first.")).toBe("I now check the data type first.");
  });

  it("distinguishes proposed, approved, achieved and overdue targets", () => {
    const asAt = new Date("2026-08-01T12:00:00Z");
    expect(reportTargetStatus("proposed", "2026-08-10", asAt)).toBe("Proposed");
    expect(reportTargetStatus("approved", "2026-08-10", asAt)).toBe("Active");
    expect(reportTargetStatus("achieved", "2026-07-20", asAt)).toBe("Achieved");
    expect(reportTargetStatus("active", "2026-07-20", asAt)).toBe("Overdue");
  });

  it("groups every academic item by unit and topic", () => {
    const groups = groupByTopic([
      { unitTitle: "Unit 4", topicTitle: "Variables", skill: "Input" },
      { unitTitle: "Unit 4", topicTitle: "Variables", skill: "Output" },
      { unitTitle: "Unit 6", topicTitle: "HTML", skill: "Semantics" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].items.map(item => item.skill)).toEqual(["Input", "Output"]);
  });

  it("reports declining evidence without inventing a cause", () => {
    expect(decliningEvidence({ change: -20, progressDifficulty: "Stretch", startingDifficulty: "Core", progressHints: 1 }))
      .toEqual(expect.objectContaining({
        declined: true, difficultyChanged: true, supportUsed: true,
        explanation: "The recorded result declined; the evidence does not establish a cause.",
      }));
  });
});
