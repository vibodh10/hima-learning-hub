import { describe, expect, it } from "vitest";
import { configuredAppOrigin, resolveAppOrigin, safeInternalPath } from "./app-origin";

describe("public application origin", () => {
  it("prefers the explicit server-only application URL", () => {
    expect(configuredAppOrigin({
      APP_URL: "https://portal.example.edu/",
      NEXT_PUBLIC_APP_URL: "https://fallback.example.edu",
    })).toBe("https://portal.example.edu");
  });

  it("uses Railway's public domain when an explicit URL is unavailable", () => {
    expect(configuredAppOrigin({ RAILWAY_PUBLIC_DOMAIN: "portal.up.railway.app" }))
      .toBe("https://portal.up.railway.app");
  });

  it("never trusts a request origin as the production application URL", () => {
    expect(resolveAppOrigin({
      configuredOrigin: null,
      requestOrigin: "http://localhost:8080",
      production: true,
    })).toBeNull();
  });

  it("allows a request origin for local development", () => {
    expect(resolveAppOrigin({
      configuredOrigin: null,
      requestOrigin: "http://localhost:3000",
      production: false,
    })).toBe("http://localhost:3000");
  });

  it("rejects paths that could redirect to another origin", () => {
    expect(safeInternalPath("//attacker.example/path")).toBe("/dashboard");
    expect(safeInternalPath("/update-password")).toBe("/update-password");
  });
});
