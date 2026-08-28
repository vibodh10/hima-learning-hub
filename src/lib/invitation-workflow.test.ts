import { describe, expect, it, vi } from "vitest";
import { runInvitationWorkflow, type InvitationGateway, type InvitationInput } from "./invitation-workflow";

const input: InvitationInput = {
  classId: "class-1",
  organisationId: "org-1",
  invitedBy: "teacher-1",
  displayName: "Test Learner",
  email: "learner@example.com",
  redirectTo: "https://portal.example.edu/auth/callback?next=/update-password",
};

function gateway(overrides: Partial<InvitationGateway> = {}): InvitationGateway {
  return {
    begin: vi.fn().mockResolvedValue({ invitationId: "invite-1" }),
    resolveExisting: vi.fn().mockResolvedValue({ kind: "none" }),
    sendNewUserInvite: vi.fn().mockResolvedValue({ userId: "user-1" }),
    sendExistingAccountRecovery: vi.fn().mockResolvedValue({ ok: true }),
    connect: vi.fn().mockResolvedValue({ ok: true }),
    mark: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("student invitation workflow", () => {
  it("sends a new invitation without provisioning before acceptance", async () => {
    const adapter = gateway();
    await expect(runInvitationWorkflow(input, adapter)).resolves.toEqual({
      kind: "sent", invitationId: "invite-1", userId: "user-1",
    });
    expect(adapter.sendNewUserInvite).toHaveBeenCalledOnce();
    expect(adapter.connect).not.toHaveBeenCalled();
  });

  it("sends a recovery link for an invited Auth account that has no profile", async () => {
    const adapter = gateway({
      resolveExisting: vi.fn().mockResolvedValue({ kind: "recoverable", userId: "invited-1" }),
    });
    await expect(runInvitationWorkflow(input, adapter)).resolves.toEqual({
      kind: "sent", invitationId: "invite-1", userId: "invited-1",
    });
    expect(adapter.sendNewUserInvite).not.toHaveBeenCalled();
    expect(adapter.sendExistingAccountRecovery).toHaveBeenCalledWith(expect.objectContaining({
      invitationId: "invite-1", userId: "invited-1",
    }));
    expect(adapter.connect).not.toHaveBeenCalled();
    expect(adapter.mark).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "sent", detailCode: "recovery_requested",
    }));
  });

  it("connects an existing student account without attempting a duplicate invite", async () => {
    const adapter = gateway({
      resolveExisting: vi.fn().mockResolvedValue({ kind: "connectable", userId: "existing-1" }),
    });
    await expect(runInvitationWorkflow(input, adapter)).resolves.toEqual({
      kind: "connected", invitationId: "invite-1", userId: "existing-1",
    });
    expect(adapter.sendNewUserInvite).not.toHaveBeenCalled();
  });

  it("blocks staff, archived, and cross-organisation account collisions", async () => {
    const adapter = gateway({
      resolveExisting: vi.fn().mockResolvedValue({ kind: "blocked", code: "staff_account" }),
    });
    await expect(runInvitationWorkflow(input, adapter)).resolves.toEqual({
      kind: "blocked", invitationId: "invite-1", code: "staff_account",
    });
    expect(adapter.connect).not.toHaveBeenCalled();
  });

  it("recovers an invite race by resolving and connecting the now-existing account", async () => {
    const adapter = gateway({
      resolveExisting: vi.fn()
        .mockResolvedValueOnce({ kind: "none" })
        .mockResolvedValueOnce({ kind: "connectable", userId: "raced-user" }),
      sendNewUserInvite: vi.fn().mockResolvedValue({ errorCode: "already_registered", accountMayExist: true }),
    });
    await expect(runInvitationWorkflow(input, adapter)).resolves.toEqual({
      kind: "connected", invitationId: "invite-1", userId: "raced-user",
    });
  });

  it("reports delivery failures without creating a class association", async () => {
    const adapter = gateway({
      sendNewUserInvite: vi.fn().mockResolvedValue({ errorCode: "email_delivery_failed" }),
    });
    await expect(runInvitationWorkflow(input, adapter)).resolves.toEqual({
      kind: "blocked", invitationId: "invite-1", code: "email_delivery_failed",
    });
    expect(adapter.connect).not.toHaveBeenCalled();
  });

  it("reports recovery delivery failures without provisioning the account", async () => {
    const adapter = gateway({
      resolveExisting: vi.fn().mockResolvedValue({ kind: "recoverable", userId: "invited-1" }),
      sendExistingAccountRecovery: vi.fn().mockResolvedValue({ ok: false, errorCode: "delivery_failed" }),
    });
    await expect(runInvitationWorkflow(input, adapter)).resolves.toEqual({
      kind: "blocked", invitationId: "invite-1", code: "delivery_failed",
    });
    expect(adapter.connect).not.toHaveBeenCalled();
  });
});
