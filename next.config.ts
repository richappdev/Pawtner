import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { validateEnvironment } from "./src/lib/environment";

validateEnvironment();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = new URL(supabaseUrl!).hostname;
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Required for Cloud Run / Docker fallback image (see Dockerfile).
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/:locale(zh-TW|en)",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:locale(zh-TW|en)/:path+",
        destination: "/:path+",
        permanent: true,
      },
    ];
  },
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

export default withNextIntl(nextConfig);
