import { describe, expect, it } from "vitest";
import {
  canIgnoreLegacyInvitationMetadata,
  invitationAcceptanceBlock,
  invitationProvisioningDetails,
} from "@/lib/invitation-finalization-policy";

describe("invitation finalization policy", () => {
  it.each(["student", "teacher", "administrator"] as const)(
    "does not block an established active %s profile for legacy metadata",
    (role) => {
      expect(canIgnoreLegacyInvitationMetadata({ role, archived_at: null }, false)).toBe(true);
    },
  );

  it("still validates a durable invitation", () => {
    expect(canIgnoreLegacyInvitationMetadata({ role: "teacher", archived_at: null }, true)).toBe(false);
  });

  it("does not revive an archived profile from legacy metadata", () => {
    expect(canIgnoreLegacyInvitationMetadata({
      role: "student",
      archived_at: "2026-08-25T12:00:00.000Z",
    }, false)).toBe(false);
  });

  it("does not treat a missing profile as provisioned", () => {
    expect(canIgnoreLegacyInvitationMetadata(null, false)).toBe(false);
  });

  it.each(["sent", "accepted"])("allows a %s invitation to finalize", (status) => {
    expect(invitationAcceptanceBlock(status)).toBeNull();
  });

  it.each([
    ["cancelled", "invitation_cancelled"],
    ["expired", "invitation_expired"],
    ["pending", "invitation_not_sent"],
    ["failed", "invitation_inactive"],
    [null, "invitation_inactive"],
  ])("blocks a %s invitation with %s", (status, code) => {
    expect(invitationAcceptanceBlock(status)).toBe(code);
  });

  it("never provisions from user-editable Auth metadata alone", () => {
    expect(invitationProvisioningDetails(null, {
      invited_class_id: "attacker-selected-class",
      invited_organisation_id: "attacker-selected-organisation",
      display_name: "Attacker-selected name",
    })).toBeNull();
  });

  it("uses only the durable invitation when metadata conflicts", () => {
    expect(invitationProvisioningDetails({
      class_id: "trusted-class",
      organisation_id: "trusted-organisation",
      display_name: "Trusted Learner",
    }, {
      invited_class_id: "attacker-selected-class",
      invited_organisation_id: "attacker-selected-organisation",
      display_name: "Attacker-selected name",
    })).toEqual({
      classId: "trusted-class",
      organisationId: "trusted-organisation",
      displayName: "Trusted Learner",
    });
  });
});
