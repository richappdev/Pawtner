import type { MetadataRoute } from "next";

import { absoluteUrl, getSiteUrl } from "@/lib/seo";
import { SUPPORTED_LOCALES, localizePathname } from "@/i18n/routing";

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
        ...SUPPORTED_LOCALES.flatMap((locale) => protectedPaths.map((path) => localizePathname(path, locale))),
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
