import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ["@talosprotocol/contracts"],
};

export default nextConfig;
