import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InvitationLifecycleControls } from "./invitation-lifecycle-controls";

vi.mock("@/app/actions/invitations", () => ({
  manageStudentInvitation: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("InvitationLifecycleControls", () => {
  afterEach(cleanup);

  it("offers retry, expiry, and cancellation for a sent invitation", () => {
    render(<InvitationLifecycleControls invitationId="invite-1" classId="class-1" status="sent"/>);
    expect(screen.getByRole("button", { name: "Send another access email" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Mark expired" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel invitation" })).toBeVisible();
  });

  it("offers only retry for a cancelled invitation", () => {
    render(<InvitationLifecycleControls invitationId="invite-1" classId="class-1" status="cancelled"/>);
    expect(screen.getByRole("button", { name: "Send another access email" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Mark expired" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel invitation" })).not.toBeInTheDocument();
  });

  it("renders no lifecycle controls after the learner has joined", () => {
    const { container } = render(<InvitationLifecycleControls invitationId="invite-1" classId="class-1" status="accepted"/>);
    expect(container).toBeEmptyDOMElement();
  });
});
