import { describe, expect, it } from "vitest";
import { canIgnoreLegacyInvitationMetadata } from "@/lib/invitation-finalization-policy";

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
});
