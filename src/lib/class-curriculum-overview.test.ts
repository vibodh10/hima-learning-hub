import { describe, expect, it } from "vitest";
import {
  projectClassCurriculumOverview,
  projectCurriculumPaperAssessments,
  type ClassCurriculumOverviewInput,
} from "./class-curriculum-overview";

const input: ClassCurriculumOverviewInput = {
  generatedAt: "2026-08-27T12:00:00.000Z",
  learners: [{ id: "learner-1", name: "Alex Learner" }],
  modules: [{ code: "A1", title: "Computational thinking" }, { code: "A2", title: "Programming constructs" }],
  progress: [],
  assessments: [],
  targets: [],
  attention: [],
};

describe("projectClassCurriculumOverview", () => {
  it("keeps absent academic evidence explicit", () => {
    expect(projectClassCurriculumOverview(input)[0]).toMatchObject({
      startingPoint: { status: "Not recorded" },
      unitProgress: { status: "Not started" },
      currentModule: { status: "Not started" },
      assessment: { status: "Not recorded" },
      targets: { status: "No active target" },
      attention: { status: "Not available" },
    });
  });

  it("shows stored module position and independently mastered counts", () => {
    const row = projectClassCurriculumOverview({
      ...input,
      progress: [
        {
          learnerId: "learner-1", topicCode: "A1", topicStartedAt: "2026-08-20T09:00:00Z",
          lessonCompletedAt: "2026-08-20T10:00:00Z", masteryScore: 82, masteredAt: null,
          currentSection: "mastery", independentAttempts: 3, updatedAt: "2026-08-20T10:00:00Z",
        },
        {
          learnerId: "learner-1", topicCode: "A2", topicStartedAt: "2026-08-21T09:00:00Z",
          lessonCompletedAt: null, masteryScore: null, masteredAt: null,
          currentSection: "lesson:2", independentAttempts: 0, updatedAt: "2026-08-21T09:30:00Z",
        },
      ],
    })[0];

    expect(row.unitProgress).toMatchObject({ status: "In progress" });
    expect(row.unitProgress.detail).toContain("2 of 2 modules started · 1 independently mastered");
    expect(row.currentModule).toMatchObject({ status: "Programming constructs" });
    expect(row.currentModule.detail).toContain("Lesson 2");
  });

  it("uses the latest exact-class assessment and exposes overdue targets", () => {
    const row = projectClassCurriculumOverview({
      ...input,
      assessments: [
        { learnerId: "learner-1", title: "Earlier check", kind: "progress_point", percentage: 80, completedAt: "2026-08-10" },
        { learnerId: "learner-1", title: "Current check", kind: "retention_check", percentage: 45, completedAt: "2026-08-20" },
      ],
      targets: [
        { learnerId: "learner-1", status: "active", targetDate: "2026-08-20" },
        { learnerId: "learner-1", status: "extended", targetDate: "2026-09-10" },
      ],
      attention: [{
        learnerId: "learner-1", startingScore: 62, status: "action_required",
        reason: "Two recent attempts are below the threshold.",
      }],
    })[0];

    expect(row.startingPoint).toMatchObject({ status: "Recorded", detail: "62% starting point" });
    expect(row.assessment).toMatchObject({ status: "Recorded", tone: "warning" });
    expect(row.assessment.detail).toContain("Current check · 45%");
    expect(row.targets).toMatchObject({ status: "Overdue", tone: "danger" });
    expect(row.attention).toMatchObject({ status: "Action needed", tone: "warning" });
  });

  it("claims unit completion only when every configured module is independently mastered", () => {
    const progress = input.modules.map((module, index) => ({
      learnerId: "learner-1", topicCode: module.code,
      topicStartedAt: `2026-08-${20 + index}T09:00:00Z`, lessonCompletedAt: `2026-08-${20 + index}T10:00:00Z`,
      masteryScore: 75, masteredAt: null, currentSection: "mastery",
      independentAttempts: 3, updatedAt: `2026-08-${20 + index}T10:00:00Z`,
    }));

    expect(projectClassCurriculumOverview({ ...input, progress })[0].unitProgress)
      .toMatchObject({ status: "Complete", tone: "positive" });
  });
});

describe("projectCurriculumPaperAssessments", () => {
  it("keeps only active-unit papers and leaves unreviewed assignments unmarked", () => {
    const assessments = projectCurriculumPaperAssessments([
      {
        learnerId: "learner-1", kind: "topic_practice", unitCode: "1", paperMode: null,
        percentage: 90, teacherMark: null, maxMark: 10, completedAt: "2026-08-25",
      },
      {
        learnerId: "learner-1", kind: "practice_paper", unitCode: "2", paperMode: "knowledge",
        percentage: 80, teacherMark: null, maxMark: 10, completedAt: "2026-08-25",
      },
      {
        learnerId: "learner-1", kind: "practice_paper", unitCode: "1", paperMode: "assignment",
        percentage: 25, teacherMark: null, maxMark: 20, completedAt: "2026-08-26",
      },
    ], "1");

    expect(assessments).toEqual([expect.objectContaining({
      title: "Assignment (awaiting review)", percentage: null,
    })]);
  });

  it("uses the teacher-awarded assignment mark when review is complete", () => {
    expect(projectCurriculumPaperAssessments([{
      learnerId: "learner-1", kind: "practice_paper", unitCode: "1", paperMode: "assignment",
      percentage: 25, teacherMark: 16, maxMark: 20, completedAt: "2026-08-26",
    }], "1")[0]).toMatchObject({ title: "Assignment", percentage: 80 });
  });
});
