import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), admin: vi.fn(), directory: vi.fn(), session: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireRole: mocks.actor }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.session }));
vi.mock("@/lib/auth-admin-directory", () => ({ findAuthUserByEmail: mocks.directory }));
vi.mock("@/lib/app-origin", () => ({ configuredAppOrigin: () => "https://sccb.up.railway.app", resolveAppOrigin: () => "https://sccb.up.railway.app" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { setupTeacherAccount } from "./staff-accounts";

describe("teacher registration without email delivery", () => {
  beforeEach(() => vi.clearAllMocks());
  function setup(role = "teacher") {
    mocks.actor.mockResolvedValue({ id: "admin", organisation_id: "college" });
    mocks.directory.mockResolvedValue({ user: { id: "tutor" } });
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "tutor", organisation_id: "college", role, display_name: "Robert Thacker", archived_at: null } }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const generateLink = vi.fn().mockResolvedValue({ data: { properties: { hashed_token: "a".repeat(64), action_link: "https://auth.example/fragile-redirect" } }, error: null });
    mocks.admin.mockReturnValue({ from: () => query, auth: { admin: { generateLink } } });
    const form = new FormData();
    form.set("name", "Robert Thacker"); form.set("email", "robert@sccb.ac.uk"); form.set("delivery", "manual");
    return { form, generateLink };
  }
  it("returns a portal link for an existing teacher without invoking email delivery", async () => {
    const { form, generateLink } = setup();
    const result = await setupTeacherAccount({}, form);
    expect(mocks.actor).toHaveBeenCalledWith("administrator");
    expect(result.setupUrl).toBe(`https://sccb.up.railway.app/register/teacher?token_hash=${"a".repeat(64)}`);
    expect(generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: "recovery", email: "robert@sccb.ac.uk" }));
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("does not issue teacher access for an existing student account", async () => {
    const { form, generateLink } = setup("student");
    expect((await setupTeacherAccount({}, form)).setupUrl).toBeUndefined();
    expect(generateLink).not.toHaveBeenCalled();
  });
});
