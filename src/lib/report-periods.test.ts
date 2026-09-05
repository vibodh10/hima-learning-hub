import { describe, expect, it } from "vitest";
import { currentCalendarQuarter, currentTeachingWeek } from "./report-periods";

describe("report periods", () => {
  it("uses Monday to Sunday for the teaching week", () => {
    expect(currentTeachingWeek(new Date("2026-09-05T12:00:00Z"))).toEqual({
      from: "2026-08-31",
      to: "2026-09-06",
    });
  });

  it("uses the current calendar quarter", () => {
    expect(currentCalendarQuarter(new Date("2026-09-05T12:00:00Z"))).toEqual({
      from: "2026-07-01",
      to: "2026-09-30",
    });
  });
});
