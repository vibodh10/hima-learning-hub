import { describe, expect, it } from "vitest";
import { projectTopicTestProgress } from "./topic-test-progress";

const result = (id: string, correct: boolean, hintsUsed = 0) => ({
  id, difficulty: 1, correct, hintsUsed, marks: 1,
  awardedMarks: correct ? 1 : 0, answer: "answer",
});

describe("topic test progress", () => {
  it("completes a week from several secure questions in one test", () => {
    const progress = projectTopicTestProgress(null, [
      result("q1", true), result("q2", true), result("q3", true), result("q4", true),
    ], 100, "2026-09-05T10:00:00Z");

    expect(progress.complete).toBe(true);
    expect(progress.independentAttempts).toBe(4);
    expect(progress.masteryScore).toBe(100);
  });

  it("requires a redo when the test is below 80 percent", () => {
    const progress = projectTopicTestProgress(null, [
      result("q1", true), result("q2", true), result("q3", false), result("q4", false),
    ], 50, "2026-09-05T10:00:00Z");

    expect(progress.complete).toBe(false);
    expect(progress.masteryScore).toBeNull();
  });

  it("does not treat hinted answers as secure evidence", () => {
    const progress = projectTopicTestProgress(null, [
      result("q1", true, 1), result("q2", true, 1), result("q3", true, 1), result("q4", true, 1),
    ], 100, "2026-09-05T10:00:00Z");

    expect(progress.complete).toBe(false);
    expect(progress.independentAttempts).toBe(0);
  });
});
