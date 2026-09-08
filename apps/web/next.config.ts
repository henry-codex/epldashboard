import path from "node:path";
import { fileURLToPath } from "node:url";
import "@epl-fellows-platform/env/web";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = (phase: string): NextConfig => ({
  typedRoutes: true,
  // Avoid Babel worker timeouts during on-demand dev compilation.
  // Keep React Compiler optimizations for production builds.
  reactCompiler: phase !== PHASE_DEVELOPMENT_SERVER,
  experimental: {
    // Persisted compilations have served stale routes and CSS after restarts/builds.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  turbopack: {
    // Monorepo root (where pnpm-lock.yaml lives) so Turbopack resolves workspace packages quickly
    root: path.join(configDir, "../.."),
  },
  async redirects() {
    return [
      {
        source: "/dashboard/checkins",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/dashboard/countries/:id/checkins",
        destination: "/dashboard/countries/:id",
        permanent: false,
      },
      {
        source: "/dashboard/alumni/programs",
        destination: "/dashboard/alumni",
        permanent: false,
      },
      {
        source: "/dashboard/alumni/newsletters",
        destination: "/dashboard/alumni",
        permanent: false,
      },
    ];
  },
});

export default nextConfig;
