import type { MetadataRoute } from "next";

import { absoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/foster",
        "/foster/",
        "/api",
        "/api/",
        "/me",
        "/favorites",
        "/applications",
        "/recommend",
        "/login",
        "/signup",
        "/pilot",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
