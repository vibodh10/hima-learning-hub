import { describe, expect, it } from "vitest";
import { formatWeeklyLearningDays, normaliseWeeklyLearningDays } from "./weekly-schedule";

describe("weekly group schedules", () => {
  it("normalises repeated, unordered teaching days", () => {
    expect(normaliseWeeklyLearningDays([5, 2, 2])).toEqual([2, 5]);
    expect(formatWeeklyLearningDays([5, 2, 2])).toBe("Tuesday / Friday");
  });

  it("falls back to the legacy journey anchor", () => {
    expect(normaliseWeeklyLearningDays(null, 3)).toEqual([3]);
    expect(formatWeeklyLearningDays(null, 3)).toBe("Wednesday");
  });

  it("does not invent a day for an unconfigured group", () => {
    expect(normaliseWeeklyLearningDays(null, null)).toEqual([]);
    expect(formatWeeklyLearningDays(null, null)).toBe("Teaching days not set");
  });
});
