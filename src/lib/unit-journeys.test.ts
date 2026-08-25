import { describe, expect, it } from "vitest";
import { configuredUnitJourneys, evidenceStageForMilestone, nextJourneyMilestone, validateConfiguredUnitJourneys } from "./unit-journeys";

describe("preconfigured Unit 2, 4 and 6 teaching journeys", () => {
  it("maps every teaching week to a real configured topic", () => {
    expect(validateConfiguredUnitJourneys()).toBe(true);
  });

  it("uses teaching-sequence milestones rather than calendar dates", () => {
    for (const journey of Object.values(configuredUnitJourneys)) {
      expect(journey.map(item => item.milestone)).toEqual([
        "starting_point", "learning", "learning", "learning", "learning", "progress_check_1",
        "learning", "learning", "learning", "progress_check_2", "learning", "final",
      ]);
      expect(journey.every(item => !("date" in item))).toBe(true);
    }
  });

  it("routes milestone submissions to separately preserved before, progress and after evidence", () => {
    expect(evidenceStageForMilestone("starting_point")).toBe("before");
    expect(evidenceStageForMilestone("progress_check_1")).toBe("progress_check_1");
    expect(evidenceStageForMilestone("progress_check_2")).toBe("progress_check_2");
    expect(evidenceStageForMilestone("final")).toBe("after");
  });

  it("finds the next checkpoint from a teaching week without calendar dates", () => {
    expect(nextJourneyMilestone("4", 2)).toMatchObject({ week: 6, milestone: "progress_check_1" });
    expect(nextJourneyMilestone("4", 6)).toMatchObject({ week: 6, milestone: "progress_check_1" });
    expect(nextJourneyMilestone("4", 7)).toMatchObject({ week: 10, milestone: "progress_check_2" });
    expect(nextJourneyMilestone("4", 11)).toMatchObject({ week: 12, milestone: "final" });
    expect(nextJourneyMilestone("4", 13)).toBeUndefined();
  });
});
