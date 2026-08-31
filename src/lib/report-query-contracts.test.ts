import { describe, expect, it } from "vitest";
import { CERTIFICATE_ELIGIBILITY_REVIEW_SELECT } from "./report-query-contracts";

describe("learner report query contracts", () => {
  it("uses the deployed achievement level threshold column", () => {
    expect(CERTIFICATE_ELIGIBILITY_REVIEW_SELECT)
      .toContain("achievement_levels(title,threshold)");
    expect(CERTIFICATE_ELIGIBILITY_REVIEW_SELECT)
      .not.toContain("threshold_points");
  });
});
