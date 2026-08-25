import { describe, expect, it } from "vitest";
import { calculateTeachingJourneyPosition } from "./teaching-journey";

describe("holiday-aware teaching journey", () => {
  it("starts at teaching week 1 without requiring an end date", () => {
    expect(calculateTeachingJourneyPosition({
      startedOn: "2026-09-07",
      weeklyLearningDay: 1,
      asOf: "2026-09-07",
      nonTeachingPeriods: [],
    })).toMatchObject({ state: "in_progress", teachingWeek: 1, totalTeachingWeeks: 12 });
  });

  it("advances on the group's configured weekly learning day", () => {
    expect(calculateTeachingJourneyPosition({
      startedOn: "2026-09-07",
      weeklyLearningDay: 1,
      asOf: "2026-09-21",
      nonTeachingPeriods: [],
    }).teachingWeek).toBe(3);
  });

  it("pauses for half term and resumes without losing a teaching week", () => {
    const input = {
      startedOn: "2026-09-28",
      weeklyLearningDay: 1,
      nonTeachingPeriods: [{ startsOn: "2026-10-19", endsOn: "2026-10-23", title: "Autumn half term" }],
    };
    expect(calculateTeachingJourneyPosition({ ...input, asOf: "2026-10-19" }))
      .toMatchObject({ state: "paused", teachingWeek: 3, pauseReason: "Autumn half term", nextTeachingOn: "2026-10-26" });
    expect(calculateTeachingJourneyPosition({ ...input, asOf: "2026-10-26" }))
      .toMatchObject({ state: "in_progress", teachingWeek: 4 });
  });

  it("skips a single college closure day", () => {
    expect(calculateTeachingJourneyPosition({
      startedOn: "2026-09-07",
      weeklyLearningDay: 1,
      asOf: "2026-09-21",
      nonTeachingPeriods: [{ startsOn: "2026-09-14", endsOn: "2026-09-14", title: "College closure" }],
    })).toMatchObject({ teachingWeek: 2, nextTeachingOn: "2026-09-28" });
  });

  it("holds week 12 until the next eligible teaching session boundary", () => {
    const position = calculateTeachingJourneyPosition({
      startedOn: "2026-09-07",
      weeklyLearningDay: 1,
      asOf: "2026-11-23",
      nonTeachingPeriods: [],
    });
    expect(position).toMatchObject({ state: "in_progress", teachingWeek: 12 });
    expect(calculateTeachingJourneyPosition({
      startedOn: "2026-09-07",
      weeklyLearningDay: 1,
      asOf: "2026-11-30",
      nonTeachingPeriods: [],
    })).toMatchObject({ state: "completed", teachingWeek: 12, nextTeachingOn: null });
  });
});
