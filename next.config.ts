import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser-based local QA uses the loopback address while Next starts on
  // localhost. Allow that origin so navigation and hot updates stay in sync.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
