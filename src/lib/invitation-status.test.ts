import { describe, expect, it } from "vitest";
import { presentInvitationStatus } from "./invitation-status";

describe("presentInvitationStatus", () => {
  it("distinguishes a joined student from an email that was only sent", () => {
    expect(presentInvitationStatus("accepted", "student_authenticated", true).label).toBe("Joined");
    expect(presentInvitationStatus("sent", "email_requested", false).label).toBe("Invitation sent");
  });

  it("preserves accepted history without claiming an archived enrolment is active", () => {
    const presentation = presentInvitationStatus("accepted", "student_authenticated", false);
    expect(presentation.label).toBe("Joined previously");
    expect(presentation.detail).toContain("not currently active");
  });

  it("explains recoverable association work without exposing an internal code", () => {
    const presentation = presentInvitationStatus("sent", "association_pending:association_failed", false);
    expect(presentation.label).toBe("Connection pending");
    expect(presentation.detail).not.toContain("association_failed");
  });

  it("gives a specific safe explanation for a blocked staff account", () => {
    expect(presentInvitationStatus("failed", "staff_account", false).detail).toContain("staff account");
  });
});
