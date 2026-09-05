import { describe, expect, it } from "vitest";
import { buildStudentWeekAccess } from "./student-week-access";
import type { LearningProgress } from "./learning-progress";

const empty: LearningProgress = { topics: {} };

describe("student teaching-week access", () => {
  it("shows the protected baseline and Week 2 after the starting point", () => {
    const access = buildStudentWeekAccess("6", 2, empty, true);

    expect(access?.focus).toMatchObject({ week: 2, topicCode: "A2" });
    expect(access?.allowedTopicCodes).toEqual(["A1", "A2"]);
    expect(access?.currentWeekBlocked).toBe(false);
  });

  it("keeps Week 3 locked while Week 2 remains incomplete", () => {
    const access = buildStudentWeekAccess("6", 3, empty, true);

    expect(access?.focus).toMatchObject({ week: 2, topicCode: "A2" });
    expect(access?.allowedTopicCodes).not.toContain("B1");
    expect(access?.currentWeekBlocked).toBe(true);
  });

  it("opens the current week after prior independent mastery", () => {
    const progress: LearningProgress = { topics: {
      "6:A2": { independentAttempts: 3, masteryScore: 80 },
    } };
    const access = buildStudentWeekAccess("6", 3, progress, true);

    expect(access?.focus).toMatchObject({ week: 3, topicCode: "B1" });
    expect(access?.allowedTopicCodes).toContain("B1");
    expect(access?.currentWeekBlocked).toBe(false);
  });

  it("opens no learning topics before the one-time starting point", () => {
    const access = buildStudentWeekAccess("6", 2, empty, false);

    expect(access?.focus).toMatchObject({ week: 1, milestone: "starting_point" });
    expect(access?.allowedTopicCodes).toEqual([]);
  });
});
