import { describe, expect, it } from "vitest";
import { publicAuthRedirect } from "./auth-redirect";

describe("publicAuthRedirect", () => {
  it("never returns Railway's internal localhost origin when a public URL is configured", () => {
    expect(publicAuthRedirect(
      "http://localhost:8080/auth/callback?code=test",
      "/update-password",
      "https://web-production-be53a.up.railway.app",
    ).toString()).toBe("https://web-production-be53a.up.railway.app/update-password");
  });

  it("rejects protocol-relative redirect paths", () => {
    expect(publicAuthRedirect(
      "http://localhost:8080/auth/callback?code=test",
      "//malicious.example/path",
      "https://web-production-be53a.up.railway.app",
    ).pathname).toBe("/dashboard");
  });
});
