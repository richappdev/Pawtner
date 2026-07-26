import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloud Run / Docker fallback image (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
