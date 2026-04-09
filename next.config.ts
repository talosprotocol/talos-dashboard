import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ["@talosprotocol/contracts"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
