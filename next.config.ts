import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Railway replaces the running build in place. Give Next.js the release
  // identity so a browser holding an older Server Action performs a hard
  // navigation instead of posting an action id that the new build cannot
  // recognise.
  deploymentId: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA,
  // Browser-based local QA uses the loopback address while Next starts on
  // localhost. Allow that origin so navigation and hot updates stay in sync.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
