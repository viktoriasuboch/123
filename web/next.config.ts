import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack root to the web/ folder so it ignores the legacy
  // package-lock.json files at the worktree and repo root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
