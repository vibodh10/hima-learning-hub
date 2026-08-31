import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("react", () => ({
  cache: (callback: unknown) => callback,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { getSessionProfile, requireRole, type Role } from "./auth";

type Profile = {
  id: string;
  display_name: string;
  role: Role;
  organisation_id: string;
};

function authClient(profile: Profile | null, options?: { authenticated?: boolean; profileError?: boolean }) {
  const authenticated = options?.authenticated ?? true;
  const single = vi.fn().mockResolvedValue({
    data: profile,
    error: options?.profileError ? { message: "profile unavailable" } : null,
  });
  const query = { single, eq: vi.fn() };
  query.eq.mockReturnValue(query);
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? { id: profile?.id ?? "auth-user" } : null },
      }),
    },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(query) }),
  };
}

const profiles: Record<Role, Profile> = {
  student: {
    id: "student-1",
    display_name: "Student One",
    role: "student",
    organisation_id: "organisation-1",
  },
  teacher: {
    id: "teacher-1",
    display_name: "Teacher One",
    role: "teacher",
    organisation_id: "organisation-1",
  },
  administrator: {
    id: "administrator-1",
    display_name: "Administrator One",
    role: "administrator",
    organisation_id: "organisation-1",
  },
};

describe("authenticated role boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("does not create an application session for an unauthenticated request", async () => {
    const client = authClient(null, { authenticated: false });
    mocks.createClient.mockResolvedValue(client);

    await expect(getSessionProfile()).resolves.toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });

  it("redirects an authenticated account without a usable profile to sign in", async () => {
    mocks.createClient.mockResolvedValue(authClient(null, { profileError: true }));

    await expect(requireRole("student", "teacher", "administrator"))
      .rejects.toThrow("redirect:/login");
  });

  it.each(["student", "teacher", "administrator"] as const)(
    "allows the %s role only when the route explicitly permits it",
    async role => {
      mocks.createClient.mockResolvedValue(authClient(profiles[role]));

      await expect(requireRole(role)).resolves.toEqual(profiles[role]);
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );

  it("redirects a student away from teacher and administrator routes", async () => {
    mocks.createClient.mockResolvedValue(authClient(profiles.student));

    await expect(requireRole("teacher", "administrator"))
      .rejects.toThrow("redirect:/dashboard");
  });

  it("redirects a teacher away from administrator-only routes", async () => {
    mocks.createClient.mockResolvedValue(authClient(profiles.teacher));

    await expect(requireRole("administrator"))
      .rejects.toThrow("redirect:/dashboard");
  });
});
