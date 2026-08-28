import { describe, expect, it } from "vitest";
import { isConfiguredUnitCode } from "./curriculum-unit-code";

describe("configured curriculum unit codes", () => {
  it("keeps every released unit available to server actions and navigation", () => {
    for (const code of ["1", "2", "4", "6", "8", "9", "10", "14"]) {
      expect(isConfiguredUnitCode(code), `Unit ${code}`).toBe(true);
    }
  });

  it("rejects unconfigured and malformed unit codes", () => {
    for (const code of ["", "3", "04", "10 ", null, undefined]) {
      expect(isConfiguredUnitCode(code)).toBe(false);
    }
  });
});

