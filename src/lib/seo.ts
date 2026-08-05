import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const SITE_NAME = "Pawtner";
export const DEFAULT_TITLE = "Pawtner｜讓每次相遇，都更接近一個家";
export const DEFAULT_DESCRIPTION =
  "以透明的生命紀錄與負責任的媒合，陪你找到適合彼此的家人。";

export const noIndexRobots = {
  index: false,
  follow: false,
} as const;

const DEFAULT_SITE_URL = "https://pawtner-tw.web.app";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  return raw.replace(/\/$/, "");
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncateDescription(text: string, max = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function pageMetadata(input: {
  title: string | { absolute: string };
  description: string;
  path: string;
  robots?: Metadata["robots"];
  image?: string;
  openGraphType?: "website" | "article";
}): Metadata {
  const canonicalPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const url = absoluteUrl(canonicalPath);
  const titleText =
    typeof input.title === "string" ? input.title : input.title.absolute;
  const images = input.image ? [{ url: input.image }] : undefined;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: canonicalPath },
    robots: input.robots,
    openGraph: {
      title: titleText,
      description: input.description,
      url,
      siteName: SITE_NAME,
      locale: "zh_TW",
      type: input.openGraphType ?? "website",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titleText,
      description: input.description,
      ...(input.image ? { images: [input.image] } : {}),
    },
  };
}

export function legalPageMetadata(title: string, path: string): Metadata {
  return pageMetadata({
    title,
    description: truncateDescription(
      `${title}｜Pawtner 寵物認養與中途媒合平台相關說明與條款。`,
    ),
    path,
  });
}

export async function localizedLegalPageMetadata(
  titleKey: "adoptionDeclaration" | "aiMedia" | "commerce" | "disputes" | "fosterTerms" | "privacy" | "retention" | "shipping" | "terms",
  path: string,
): Promise<Metadata> {
  const t = await getTranslations("Legal");
  const title = t(titleKey);
  return pageMetadata({
    title,
    description: truncateDescription(t("description", { title })),
    path,
  });
}

export async function localizedPageMetadata(
  titleKey: "homeTitle" | "exploreTitle" | "productsTitle" | "loginTitle" | "signupTitle" | "applicationsTitle" | "favoritesTitle" | "recommendTitle" | "meTitle",
  path: string,
  options?: { descriptionKey?: "siteDescription" | "applicationsDescription" | "favoritesDescription" | "recommendDescription" | "meDescription"; robots?: Metadata["robots"] },
): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return pageMetadata({ title: t(titleKey), description: t(options?.descriptionKey ?? "siteDescription"), path, robots: options?.robots });
}
