import { describe, expect, it } from "vitest";
import { latestIncompleteCurriculumPosition, progressKey, progressKeyFor } from "./learning-progress";

describe("learner progress storage isolation", () => {
  it("uses a different browser-storage key for every learner", () => {
    const first = progressKeyFor("learner-a");
    const second = progressKeyFor("learner-b");

    expect(first).toBe(`${progressKey}:learner-a`);
    expect(second).toBe(`${progressKey}:learner-b`);
    expect(first).not.toBe(second);
  });
});

describe("latestIncompleteCurriculumPosition", () => {
  it("returns the most recently updated incomplete module section", () => {
    expect(latestIncompleteCurriculumPosition([
      { unit_code: "4", topic_code: "A1", topic_started_at: "2026-08-20T10:00:00Z", current_section: "lesson:2", mastery_score: null, independent_attempts: 0, updated_at: "2026-08-20T10:10:00Z" },
      { unit_code: "4", topic_code: "A2", topic_started_at: "2026-08-21T10:00:00Z", current_section: "practice", mastery_score: null, independent_attempts: 0, updated_at: "2026-08-21T10:15:00Z" },
    ])).toEqual({
      unitCode: "4",
      topicCode: "A2",
      section: "practice",
      updatedAt: "2026-08-21T10:15:00Z",
    });
  });

  it("does not resume a module with secure repeated mastery", () => {
    expect(latestIncompleteCurriculumPosition([
      { unit_code: "4", topic_code: "A1", topic_started_at: "2026-08-20T10:00:00Z", current_section: "mastery", mastery_score: 85, independent_attempts: 3, updated_at: "2026-08-22T10:15:00Z" },
    ])).toBeUndefined();
  });
});
