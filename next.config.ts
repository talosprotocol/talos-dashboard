import type { NextConfig } from "next";
import path from "node:path";

const dashboardRoot = process.cwd();
const repoRoot = path.resolve(dashboardRoot, "../..");
const toPosix = (value: string) => value.split(path.sep).join("/");
const ignoredWorkspaceDirs = [
  ".agent",
  "deploy",
  "docs",
  "examples",
  "proto",
  "sdks",
  "services",
  "tests",
  "tools",
].map((dir) => `${toPosix(path.join(repoRoot, dir))}/**`);

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ["@talosprotocol/contracts"],
  turbopack: {
    root: dashboardRoot,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      const ignored = config.watchOptions?.ignored;
      const existingIgnored = Array.isArray(ignored) ? ignored : ignored ? [ignored] : [];
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          ...existingIgnored.filter((item): item is string => typeof item === "string" && item.length > 0),
          ...ignoredWorkspaceDirs,
        ],
      };
    }

    return config;
  },
  staticPageGenerationTimeout: 1000,
};

export default nextConfig;
