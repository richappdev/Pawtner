import type { MetadataRoute } from "next";

import { absoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const protectedPaths = [
    "/admin", "/admin/", "/foster", "/foster/", "/me", "/favorites",
    "/applications", "/recommend", "/login", "/signup", "/pilot",
  ];
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api",
        "/api/",
        ...protectedPaths,
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
