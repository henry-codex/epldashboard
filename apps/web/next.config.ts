import path from "node:path";
import { fileURLToPath } from "node:url";
import "@epl-fellows-platform/env/web";
import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
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
};

export default nextConfig;
