import { describe, expect, it } from "vitest";
import { presentInvitationStatus } from "./invitation-status";

describe("presentInvitationStatus", () => {
  it("distinguishes a joined student from an email that was only sent", () => {
    expect(presentInvitationStatus("accepted", "student_authenticated").label).toBe("Joined");
    expect(presentInvitationStatus("sent", "email_requested").label).toBe("Invitation sent");
  });

  it("explains recoverable association work without exposing an internal code", () => {
    const presentation = presentInvitationStatus("sent", "association_pending:association_failed");
    expect(presentation.label).toBe("Connection pending");
    expect(presentation.detail).not.toContain("association_failed");
  });

  it("gives a specific safe explanation for a blocked staff account", () => {
    expect(presentInvitationStatus("failed", "staff_account").detail).toContain("staff account");
  });
});
