import { describe, expect, it } from "vitest";
import { hasCompleteUnitStartingPoint } from "./unit-starting-point";

function evidence(unitCode: string, topicCode: string, index: number, extra: Record<string, unknown> = {}) {
  return {
    id: `${unitCode}:${topicCode}:${index}`,
    kind: "initial_diagnostic",
    unitCode,
    topicCode,
    independent: true,
    hintsUsed: 0,
    ...extra,
  };
}

describe("unit starting-point completion", () => {
  it("requires three valid diagnostic responses for every configured topic", () => {
    const rows = ["A1", "A2"].map(topicCode => ({
      unit_code: "6",
      topic_code: topicCode,
      evidence: [0, 1, 2].map(index => evidence("6", topicCode, index)),
    }));
    expect(hasCompleteUnitStartingPoint(rows, "6", ["A1", "A2"])).toBe(true);
  });

  it("rejects partial, hinted, or cross-unit evidence", () => {
    const rows = [{
      unit_code: "6",
      topic_code: "A1",
      evidence: [evidence("6", "A1", 0), evidence("6", "A1", 1, { hintsUsed: 1 }), evidence("4", "A1", 2)],
    }];
    expect(hasCompleteUnitStartingPoint(rows, "6", ["A1"])).toBe(false);
    expect(hasCompleteUnitStartingPoint(rows, "6", ["A1", "A2"])).toBe(false);
  });
});
