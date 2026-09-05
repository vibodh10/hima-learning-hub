import { describe, expect, it } from "vitest";
import { averageCurrentClassScore } from "./class-progress-summary";

describe("class progress summary", () => {
  it("averages only recorded scores from the already class-scoped projection", () => {
    expect(averageCurrentClassScore([
      { currentScore: 72 },
      { currentScore: null },
      { currentScore: 83 },
    ])).toBe(78);
  });

  it("does not invent a percentage when no current evidence is recorded", () => {
    expect(averageCurrentClassScore([{ currentScore: null }])).toBeNull();
    expect(averageCurrentClassScore([])).toBeNull();
  });
});
