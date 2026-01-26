import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ["@talos-protocol/contracts"],
};

export default nextConfig;
