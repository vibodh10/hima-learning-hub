export type InvitationInput = {
  classId: string;
  organisationId: string;
  invitedBy: string;
  displayName: string;
  email: string;
  redirectTo: string;
};

export type ExistingAccountResolution =
  | { kind: "none" }
  | { kind: "recoverable"; userId: string }
  | { kind: "connectable"; userId: string }
  | { kind: "blocked"; code: string };

export type InvitationWorkflowResult =
  | { kind: "sent"; invitationId: string; userId: string }
  | { kind: "connected"; invitationId: string; userId: string }
  | { kind: "blocked"; invitationId?: string; code: string };

export type InvitationGateway = {
  begin(input: InvitationInput): Promise<{ invitationId: string } | { errorCode: string }>;
  resolveExisting(email: string): Promise<ExistingAccountResolution>;
  sendNewUserInvite(input: InvitationInput & { invitationId: string }): Promise<
    { userId: string } | { errorCode: string; accountMayExist?: boolean }
  >;
  sendExistingAccountRecovery(input: InvitationInput & { invitationId: string; userId: string }): Promise<
    { ok: true } | { ok: false; errorCode: string }
  >;
  connect(input: InvitationInput & { invitationId: string; userId: string }): Promise<{ ok: true } | { ok: false; errorCode: string }>;
  mark(input: {
    invitationId: string;
    status: "sent" | "accepted" | "failed";
    userId?: string;
    detailCode: string;
  }): Promise<void>;
};

export async function runInvitationWorkflow(
  input: InvitationInput,
  gateway: InvitationGateway,
): Promise<InvitationWorkflowResult> {
  const begun = await gateway.begin(input);
  if ("errorCode" in begun) return { kind: "blocked", code: begun.errorCode };
  const invitationId = begun.invitationId;
  let existing = await gateway.resolveExisting(input.email);

  if (existing.kind === "blocked") {
    await safelyMark(gateway, { invitationId, status: "failed", detailCode: existing.code });
    return { kind: "blocked", invitationId, code: existing.code };
  }

  if (existing.kind === "connectable") {
    return connectExisting(input, invitationId, existing.userId, gateway);
  }
  if (existing.kind === "recoverable") {
    return recoverExisting(input, invitationId, existing.userId, gateway);
  }

  const sent = await gateway.sendNewUserInvite({ ...input, invitationId });
  if ("errorCode" in sent) {
    if (sent.accountMayExist) {
      existing = await gateway.resolveExisting(input.email);
      if (existing.kind === "connectable") {
        return connectExisting(input, invitationId, existing.userId, gateway);
      }
      if (existing.kind === "recoverable") {
        return recoverExisting(input, invitationId, existing.userId, gateway);
      }
    }
    await safelyMark(gateway, { invitationId, status: "failed", detailCode: sent.errorCode });
    return { kind: "blocked", invitationId, code: sent.errorCode };
  }

  await safelyMark(gateway, {
    invitationId,
    status: "sent",
    userId: sent.userId,
    detailCode: "email_requested",
  });
  return { kind: "sent", invitationId, userId: sent.userId };
}

async function recoverExisting(
  input: InvitationInput,
  invitationId: string,
  userId: string,
  gateway: InvitationGateway,
): Promise<InvitationWorkflowResult> {
  const sent = await gateway.sendExistingAccountRecovery({ ...input, invitationId, userId });
  if (!sent.ok) {
    await safelyMark(gateway, {
      invitationId,
      status: "failed",
      userId,
      detailCode: sent.errorCode,
    });
    return { kind: "blocked", invitationId, code: sent.errorCode };
  }
  await safelyMark(gateway, {
    invitationId,
    status: "sent",
    userId,
    detailCode: "recovery_requested",
  });
  return { kind: "sent", invitationId, userId };
}

async function connectExisting(
  input: InvitationInput,
  invitationId: string,
  userId: string,
  gateway: InvitationGateway,
): Promise<InvitationWorkflowResult> {
  const connected = await gateway.connect({ ...input, invitationId, userId });
  if (!connected.ok) {
    await safelyMark(gateway, {
      invitationId,
      status: "failed",
      userId,
      detailCode: connected.errorCode,
    });
    return { kind: "blocked", invitationId, code: connected.errorCode };
  }
  await safelyMark(gateway, {
    invitationId,
    status: "accepted",
    userId,
    detailCode: "existing_account_connected",
  });
  return { kind: "connected", invitationId, userId };
}

async function safelyMark(gateway: InvitationGateway, input: Parameters<InvitationGateway["mark"]>[0]) {
  try {
    await gateway.mark(input);
  } catch {
    // Email delivery or an account connection must not be undone merely because
    // the optional staff-facing event record could not be updated.
  }
}
