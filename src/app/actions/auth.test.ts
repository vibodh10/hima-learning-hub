import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  finalizeInvitation: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/invitation-finalization", () => ({
  finalizeCurrentStudentInvitation: mocks.finalizeInvitation,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { updatePassword } from "@/app/actions/auth";

function passwordForm() {
  const form = new FormData();
  form.set("password", "Strong password 2026");
  return form;
}

function authClient(metadata: Record<string, unknown>) {
  return {
    auth: {
      updateUser: vi.fn().mockResolvedValue({
        data: { user: { user_metadata: metadata } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

describe("updatePassword invitation finalisation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => undefined);
  });

  it("finalises an invited student's group before opening the dashboard", async () => {
    const client = authClient({
      requested_role: "student",
      invited_class_id: "9b27d78b-1892-4254-8f51-5a6012f3a5cd",
    });
    mocks.createClient.mockResolvedValue(client);
    mocks.finalizeInvitation.mockResolvedValue({ kind: "ready", classId: "9b27d78b-1892-4254-8f51-5a6012f3a5cd" });

    await updatePassword({}, passwordForm());

    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: "Strong password 2026" });
    expect(mocks.finalizeInvitation).toHaveBeenCalledOnce();
    expect(client.auth.signOut).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("fails safely when the password changes but the class cannot be connected", async () => {
    const client = authClient({
      requested_role: "student",
      invited_class_id: "9b27d78b-1892-4254-8f51-5a6012f3a5cd",
    });
    mocks.createClient.mockResolvedValue(client);
    mocks.finalizeInvitation.mockResolvedValue({ kind: "failed", code: "enrolment_failed" });

    const result = await updatePassword({}, passwordForm());

    expect(client.auth.signOut).toHaveBeenCalledOnce();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(result.message).toContain("password was updated");
    expect(result.message).toContain("Sign in with your new password");
  });

  it("does not treat an ordinary staff password reset as a student invitation", async () => {
    const client = authClient({ requested_role: "teacher" });
    mocks.createClient.mockResolvedValue(client);

    await updatePassword({}, passwordForm());

    expect(mocks.finalizeInvitation).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});
