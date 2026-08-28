import { describe, expect, it } from "vitest";
import { classInvitationReadiness } from "./class-invitation-readiness";

const ready = {
  published: true,
  activeUnitId: "unit-4",
  activeClassUnitIds: ["unit-4"],
  configuredUnitCode: "4",
  hasApprovedJourney: true,
};

describe("class invitation readiness", () => {
  it("allows a published group with a configured current unit and approved journey", () => {
    expect(classInvitationReadiness(ready)).toEqual({ ready: true });
  });

  it("blocks unpublished groups", () => {
    expect(classInvitationReadiness({ ...ready, published: false })).toMatchObject({
      ready: false,
      message: "Choose and publish at least one unit before inviting students.",
    });
  });

  it("blocks a current unit that is not assigned to the group", () => {
    expect(classInvitationReadiness({ ...ready, activeUnitId: "unit-6" })).toMatchObject({
      ready: false,
      message: "Choose the group's current unit before inviting students.",
    });
  });

  it("blocks curriculum without an approved automatic journey", () => {
    expect(classInvitationReadiness({ ...ready, hasApprovedJourney: false })).toMatchObject({
      ready: false,
      message: "This group's current unit is not release-ready, so no invitation was sent.",
    });
  });
});
