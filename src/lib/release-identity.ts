export type ReleaseIdentity = {
  status: "ok";
  service: "sccb-digital-learning-hub";
  commit: string | null;
  environment: "production" | "staging" | "preview" | "unknown";
};

type ReleaseEnvironment = Readonly<Record<string, string | undefined>>;

export function releaseIdentity(env: ReleaseEnvironment): ReleaseIdentity {
  const commit = firstCommit(
    env.RAILWAY_GIT_COMMIT_SHA,
    env.GIT_COMMIT_SHA,
    env.VERCEL_GIT_COMMIT_SHA,
  );
  const environment = normaliseEnvironment(
    env.RAILWAY_ENVIRONMENT_NAME ?? env.VERCEL_ENV,
  );

  return {
    status: "ok",
    service: "sccb-digital-learning-hub",
    commit,
    environment,
  };
}

function firstCommit(...values: (string | undefined)[]) {
  for (const value of values) {
    const normalised = value?.trim().toLowerCase();
    if (normalised && /^[0-9a-f]{7,64}$/.test(normalised)) return normalised;
  }
  return null;
}

function normaliseEnvironment(value: string | undefined): ReleaseIdentity["environment"] {
  const normalised = value?.trim().toLowerCase();
  return normalised === "production" || normalised === "staging" || normalised === "preview"
    ? normalised
    : "unknown";
}
