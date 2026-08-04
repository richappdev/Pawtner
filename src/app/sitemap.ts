import type { MetadataRoute } from "next";

import { listPublicPetIds } from "@/lib/pets/public-data";
import { absoluteUrl } from "@/lib/seo";
import { createServiceClient } from "@/lib/supabase/server";
import { SUPPORTED_LOCALES, localizePathname } from "@/i18n/routing";

const STATIC_PATHS = [
  "/",
  "/explore",
  "/products",
  "/legal/privacy",
  "/legal/terms",
  "/legal/ai-media",
  "/legal/commerce",
  "/legal/retention",
  "/legal/shipping",
  "/legal/disputes",
  "/legal/adoption-declaration",
  "/legal/foster-terms",
] as const;

async function listDonationOrgSlugs(): Promise<string[]> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: authorizations, error } = await supabase
    .from("fundraising_authorizations")
    .select("organization_id")
    .eq("is_active", true)
    .lte("valid_from", today)
    .gte("valid_to", today);
  if (error || !authorizations?.length) return [];

  const orgIds = [...new Set(authorizations.map((row) => row.organization_id))];
  const { data: organizations } = await supabase
    .from("organizations")
    .select("slug")
    .in("id", orgIds)
    .eq("is_verified", true);
  return (organizations ?? [])
    .map((org) => org.slug)
    .filter((slug): slug is string => Boolean(slug));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const languageAlternates = (path: string) => Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, absoluteUrl(localizePathname(path, locale))]),
  );
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) => SUPPORTED_LOCALES.map((locale) => ({
    url: absoluteUrl(localizePathname(path, locale)),
    changeFrequency: path === "/" || path === "/explore" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/explore" ? 0.9 : 0.5,
    alternates: { languages: languageAlternates(path) },
  })));

  let petEntries: MetadataRoute.Sitemap = [];
  try {
    const pets = await listPublicPetIds();
    petEntries = pets.flatMap((pet) => SUPPORTED_LOCALES.map((locale) => ({
      url: absoluteUrl(localizePathname(`/pets/${pet.id}`, locale)),
      lastModified: pet.publishedAt ? new Date(pet.publishedAt) : undefined,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: { languages: languageAlternates(`/pets/${pet.id}`) },
    })));
  } catch {
    petEntries = [];
  }

  let donateEntries: MetadataRoute.Sitemap = [];
  try {
    const slugs = await listDonationOrgSlugs();
    donateEntries = slugs.flatMap((slug) => SUPPORTED_LOCALES.map((locale) => ({
      url: absoluteUrl(localizePathname(`/donate/${slug}`, locale)),
      changeFrequency: "weekly",
      priority: 0.4,
      alternates: { languages: languageAlternates(`/donate/${slug}`) },
    })));
  } catch {
    donateEntries = [];
  }

  return [...staticEntries, ...petEntries, ...donateEntries];
}
