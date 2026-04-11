import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ["@talosprotocol/contracts"],
  staticPageGenerationTimeout: 1000,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
