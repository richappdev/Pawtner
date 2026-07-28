import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "rlwctljjjvlxrexcgqmg.supabase.co";

const nextConfig: NextConfig = {
  // Required for Cloud Run / Docker fallback image (see Dockerfile).
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/sign/pet-media/**",
      },
      {
        protocol: "https",
        hostname: "www.pet.gov.tw",
        pathname: "/upload/pic/**",
      },
    ],
  },
};

export default nextConfig;
