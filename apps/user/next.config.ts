import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["db", "shared"],
};

export default nextConfig;
