import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth })),
}));

import { refreshSupabaseSession } from "@/lib/supabase/proxy";

describe("Supabase session proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
  });

  it("expires only this project's Auth cookie chunks when the refresh token is gone", async () => {
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { code: "refresh_token_not_found" },
    });
    const request = new NextRequest("https://portal.example/dashboard", {
      headers: {
        cookie: [
          "sb-project-ref-auth-token.0=stale-a",
          "sb-project-ref-auth-token.1=stale-b",
          "unrelated=value",
        ].join("; "),
      },
    });

    const response = await refreshSupabaseSession(request);
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("sb-project-ref-auth-token.0=");
    expect(setCookie).toContain("sb-project-ref-auth-token.1=");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(setCookie).not.toContain("unrelated=");
  });

  it("does not expire cookies for a healthy or anonymous request", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const request = new NextRequest("https://portal.example/login", {
      headers: { cookie: "sb-project-ref-auth-token=healthy; unrelated=value" },
    });

    const response = await refreshSupabaseSession(request);

    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
