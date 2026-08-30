import { describe, expect, it } from "vitest";
import { isSccbStaffEmail } from "./staff-email";

describe("SCCB staff email validation", () => {
  it.each([
    "himabindu.gunde@sccb.ac.uk",
    " Himabindu.Gunde@SCCB.AC.UK ",
  ])("accepts a verified SCCB address: %s", email => {
    expect(isSccbStaffEmail(email)).toBe(true);
  });

  it.each([
    "himabindu.gunde@gmail.com",
    "himabindu.gunde@sccb.ac.uk.example.com",
    "himabindu.gunde@subdomain.sccb.ac.uk",
    "sccb.ac.uk",
  ])("rejects a non-SCCB staff address: %s", email => {
    expect(isSccbStaffEmail(email)).toBe(false);
  });
});
