import { describe, expect, it } from "vitest";
import {
  canIgnoreLegacyInvitationMetadata,
  invitationAcceptanceBlock,
  invitationProvisioningDetails,
  validStoredGuid,
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

  it("accepts the hosted curriculum's fixed version-0 organisation identifier", () => {
    expect(validStoredGuid("10000000-0000-0000-0000-000000000001"))
      .toBe("10000000-0000-0000-0000-000000000001");
  });

  it("continues to accept generated RFC UUIDs and reject malformed identifiers", () => {
    expect(validStoredGuid("9b27d78b-1892-4254-8f51-5a6012f3a5cd"))
      .toBe("9b27d78b-1892-4254-8f51-5a6012f3a5cd");
    expect(validStoredGuid("not-a-database-id")).toBeNull();
  });
});
