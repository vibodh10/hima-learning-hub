import { describe, expect, it } from "vitest";
import { unitByCode } from "./learning-catalog";
import { isExternalAssessmentUnit } from "./unit-assessment-kind";

describe("unit assessment kind", () => {
  it("allows paper practice only for external assessment units", () => {
    expect(isExternalAssessmentUnit(unitByCode("1")!)).toBe(true);
    expect(isExternalAssessmentUnit(unitByCode("2")!)).toBe(true);
    expect(isExternalAssessmentUnit(unitByCode("14")!)).toBe(true);
    expect(isExternalAssessmentUnit(unitByCode("4")!)).toBe(false);
    expect(isExternalAssessmentUnit(unitByCode("6")!)).toBe(false);
  });
});
