import { describe, expect, it } from "vitest";
import { learningCycle, pearsonUnits } from "./pearson-curriculum";

describe("Pearson Units 2, 4 and 6 curriculum map", () => {
  it("contains every audited unit and its specification sections", () => {
    expect(pearsonUnits.map(unit => unit.code)).toEqual(["2", "4", "6"]);
    expect(pearsonUnits.find(unit => unit.code === "2")?.topics.map(topic => topic.code)).toEqual(["A1", "A2", "A3", "B1", "B2", "C1", "C2", "D1–D3"]);
    expect(pearsonUnits.find(unit => unit.code === "4")?.topics.map(topic => topic.code)).toEqual(["A1", "A2–A3", "A4", "A5–A6", "B1", "B2", "C1–C2", "C3–C5"]);
    expect(pearsonUnits.find(unit => unit.code === "6")?.topics.map(topic => topic.code)).toEqual(["A1", "A2", "B1", "B2", "C1", "C2", "C3–C5"]);
  });

  it("requires the full teaching sequence for every topic", () => {
    for (const unit of pearsonUnits) {
      for (const topic of unit.topics) {
        expect(topic.content.length).toBeGreaterThan(2);
        expect(topic.phases.map(phase => phase.label)).toEqual(learningCycle);
        expect(topic.phases.every(phase => phase.detail.length > 30)).toBe(true);
      }
    }
  });
});
