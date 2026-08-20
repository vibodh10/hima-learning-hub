import { describe, expect, it } from "vitest";
import { markAnswer, pathwayFor, percentage, progressSummary, targetFor } from "./domain";

describe("deterministic marking", () => {
  it("marks accepted text variations without fuzzy AI", () => {
    expect(markAnswer({ id: "q", type: "fill_blank", correctAnswer: "CPU", alternatives: ["central processing unit"], marks: 1 }, " Central   Processing Unit ").correct).toBe(true);
  });
  it("requires an exact set for multiple response", () => {
    const question = { id: "q", type: "multiple_response" as const, correctAnswer: ["A", "C"], marks: 2 };
    expect(markAnswer(question, ["c", "A"]).mark).toBe(2);
    expect(markAnswer(question, ["A"]).mark).toBe(0);
  });
  it("supports numeric tolerance", () => {
    expect(markAnswer({ id: "q", type: "numeric", correctAnswer: 3.14, tolerance: 0.01, marks: 1 }, "3.145").correct).toBe(true);
  });
});

describe("progress and differentiation", () => {
  it("calculates score and immutable-attempt summaries", () => {
    expect(percentage(4, 5)).toBe(80);
    expect(progressSummary([40, 60, 80])).toEqual({ first: 40, latest: 80, best: 80, average: 60, improvement: 40 });
  });
  it("does not treat a heavily hinted score as mastery", () => {
    expect(pathwayFor(88, 3)).toBe("Stretch");
    expect(pathwayFor(100, 6)).toBe("Stretch");
    expect(pathwayFor(90)).toBe("Mastery");
  });
  it("generates a measurable proposed target", () => {
    expect(targetFor("Network security", 42, "18 October 2026")).toMatchObject({ pathway: "Support", status: "proposed" });
  });
});
