import { describe, expect, it } from "vitest";
import { plainDisplayText } from "./plain-display-text";

describe("plainDisplayText", () => {
  it("uses ordinary ASCII hyphens for display text", () => {
    expect(plainDisplayText("A2–A3 — review‑ready"))
      .toBe("A2-A3 - review-ready");
  });
});
