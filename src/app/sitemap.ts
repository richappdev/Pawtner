import type { MetadataRoute } from "next";

import { listPublicPetIds } from "@/lib/pets/public-data";
import { absoluteUrl } from "@/lib/seo";
import { createServiceClient } from "@/lib/supabase/server";

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
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === "/" || path === "/explore" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/explore" ? 0.9 : 0.5,
  }));

  let petEntries: MetadataRoute.Sitemap = [];
  try {
    const pets = await listPublicPetIds();
    petEntries = pets.map((pet) => ({
      url: absoluteUrl(`/pets/${pet.id}`),
      lastModified: pet.publishedAt ? new Date(pet.publishedAt) : undefined,
      changeFrequency: "daily",
      priority: 0.8,
    }));
  } catch {
    petEntries = [];
  }

  let donateEntries: MetadataRoute.Sitemap = [];
  try {
    const slugs = await listDonationOrgSlugs();
    donateEntries = slugs.map((slug) => ({
      url: absoluteUrl(`/donate/${slug}`),
      changeFrequency: "weekly",
      priority: 0.4,
    }));
  } catch {
    donateEntries = [];
  }

  return [...staticEntries, ...petEntries, ...donateEntries];
}
