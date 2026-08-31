import { describe, expect, it } from "vitest";
import { summariseWorkbookStartingPoint } from "./workbook-starting-point";

function evidence(topicCode: string, index: number, correct: boolean, overrides: Record<string, unknown> = {}) {
  return {
    id: `${topicCode}-${index}`,
    kind: "initial_diagnostic",
    unitCode: "6",
    topicCode,
    skill: `${topicCode} skill ${index}`,
    correct,
    independent: true,
    hintsUsed: 0,
    recordedAt: `2026-08-31T20:${String(index).padStart(2, "0")}:00.000Z`,
    ...overrides,
  };
}

describe("adaptive workbook starting-point projection", () => {
  it("projects the hosted 7 of 21 Support result without changing its meaning", () => {
    const topics = ["A1", "A2", "B1", "B2", "C1", "C2", "C3-C5"];
    const rows = topics.map((topicCode, topicIndex) => ({
      unit_code: "6",
      topic_code: topicCode,
      selected_level: "Support",
      evidence: [0, 1, 2].map((index) => evidence(topicCode, topicIndex * 3 + index, index === 0)),
    }));

    expect(summariseWorkbookStartingPoint(rows, "6", topics)).toEqual(expect.objectContaining({
      complete: true,
      mark: 7,
      maxMark: 21,
      percentage: 33.3,
      recommendedLevel: "Support",
      completedAt: "2026-08-31T20:20:00.000Z",
    }));
  });

  it("keeps partial or unsupported evidence out of a completed baseline claim", () => {
    const summary = summariseWorkbookStartingPoint([{
      unit_code: "6",
      topic_code: "A1",
      selected_level: "Core",
      evidence: [
        evidence("A1", 1, true),
        evidence("A1", 2, false, { hintsUsed: 1 }),
        evidence("A1", 3, true, { independent: false }),
      ],
    }], "6", ["A1", "A2"]);

    expect(summary).toMatchObject({ complete: false, mark: 1, maxMark: 1, percentage: 100 });
    expect(summary?.topics.find(topic => topic.topicCode === "A2")).toMatchObject({ maxMark: 0 });
  });

  it("deduplicates repeated stored evidence and ignores another unit", () => {
    const duplicate = evidence("A1", 1, true);
    const summary = summariseWorkbookStartingPoint([
      { unit_code: "6", topic_code: "A1", evidence: [duplicate, duplicate] },
      { unit_code: "4", topic_code: "A1", evidence: [{ ...duplicate, unitCode: "4" }] },
    ], "6", ["A1"], 1);

    expect(summary).toMatchObject({ complete: true, mark: 1, maxMark: 1 });
  });
});
