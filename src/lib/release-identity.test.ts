import { describe, expect, it } from "vitest";
import { releaseIdentity } from "./release-identity";

describe("releaseIdentity", () => {
  it("returns only a validated deployment commit and recognised environment", () => {
    expect(releaseIdentity({
      RAILWAY_GIT_COMMIT_SHA: "C8F179230F3DC6560161DA51D8E2DE7EFDE6EA9E",
      RAILWAY_ENVIRONMENT_NAME: "production",
    })).toEqual({
      status: "ok",
      service: "sccb-digital-learning-hub",
      commit: "c8f179230f3dc6560161da51d8e2de7efde6ea9e",
      environment: "production",
    });
  });

  it("does not echo arbitrary environment values", () => {
    expect(releaseIdentity({
      RAILWAY_GIT_COMMIT_SHA: "not-a-commit-or-secret",
      RAILWAY_ENVIRONMENT_NAME: "internal-environment-name",
    })).toMatchObject({ commit: null, environment: "unknown" });
  });

  it("supports an explicit generic commit injected by another host", () => {
    expect(releaseIdentity({ GIT_COMMIT_SHA: "1234567" }).commit).toBe("1234567");
  });
});
