import type { SupabaseClient } from "@supabase/supabase-js";

import { getFlag } from "@/lib/feature-flags";
import type {
  PetMediaView,
  PublicHealthRecord,
  PublicPetDetail,
  PublicPetPage,
  PublicPetSearch,
  PublicPetSummary,
} from "@/lib/pets/public-types";
import { PET_MEDIA_BUCKET, selectPublicPetMediaRows, type PetMediaRow } from "@/lib/pets/media";
import type { PetSpecies, PetStatus } from "@/lib/schemas/pet";
import { createServiceClient } from "@/lib/supabase/server";

type RawPublicPet = {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  sex: "male" | "female" | "unknown" | null;
  age_months: number | null;
  age_band: "child" | "adult" | "senior" | "unknown" | null;
  body_size: "small" | "medium" | "large" | "unknown" | null;
  weight_kg: number | string | null;
  color: string | null;
  region: string | null;
  found_location: string | null;
  status: PetStatus;
  source_type: "private_foster" | "government";
  sterilized: boolean | null;
  microchipped: boolean | null;
  vaccinated: boolean | null;
  rabies_vaccinated: boolean | null;
  dewormed: boolean | null;
  personality_summary: string | null;
  special_care: string | null;
  adoption_conditions: string | null;
  tags: string[] | null;
  published_at: string | null;
  foster_display_name: string | null;
  organization_name: string | null;
  organization_slug: string | null;
  organization_verified: boolean | null;
  source_label: string | null;
  source_attribution: string | null;
  dataset_url: string | null;
  license_name: string | null;
  license_url: string | null;
  official_reference: string | null;
  shelter_name: string | null;
  shelter_address: string | null;
  shelter_phone: string | null;
  official_url: string | null;
  adoption_open_at: string | null;
  last_seen_at: string | null;
};

const PUBLIC_SELECT = [
  "id", "name", "species", "breed", "sex", "age_months", "age_band", "body_size",
  "weight_kg", "color", "region", "found_location", "status", "source_type",
  "sterilized", "microchipped", "vaccinated", "rabies_vaccinated", "dewormed",
  "personality_summary", "special_care", "adoption_conditions", "tags", "published_at",
  "foster_display_name", "organization_name", "organization_slug", "organization_verified",
  "source_label", "source_attribution", "dataset_url", "license_name", "license_url",
  "official_reference", "shelter_name", "shelter_address", "shelter_phone",
  "official_url", "adoption_open_at", "last_seen_at",
].join(",");

function freshness(lastSeenAt: string | null): string | null {
  if (!lastSeenAt) return null;
  const days = Math.max(0, Math.floor((Date.now() - new Date(lastSeenAt).valueOf()) / 86_400_000));
  if (days === 0) return "今天更新";
  if (days === 1) return "昨天更新";
  return `${days} 天前更新`;
}

async function mediaByPet(
  supabase: SupabaseClient,
  pets: Array<{ id: string; name: string; source_type: "private_foster" | "government" }>,
): Promise<Map<string, PetMediaView[]>> {
  const result = new Map<string, PetMediaView[]>();
  if (!pets.length) return result;
  const names = new Map(pets.map((pet) => [pet.id, pet.name]));
  const { data } = await supabase
    .from("pet_media")
    .select("id,pet_id,storage_path,external_url,media_type,is_cover,is_ai_edited,is_public,sort_order")
    .in("pet_id", pets.map((pet) => pet.id))
    .eq("is_public", true)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true });
  const rows = (data ?? []) as PetMediaRow[];
  const selectedRows = pets.flatMap((pet) =>
    selectPublicPetMediaRows(
      rows.filter((row) => row.pet_id === pet.id),
      pet.source_type,
    ),
  );
  const stored = selectedRows.filter((row) => row.storage_path);
  const signed = stored.length
    ? await supabase.storage.from(PET_MEDIA_BUCKET).createSignedUrls(
        stored.map((row) => row.storage_path!),
        60 * 60,
      )
    : { data: [] };
  const signedUrls = new Map(
    stored.map((row, index) => [row.id, signed.data?.[index]?.signedUrl ?? null]),
  );

  for (const row of selectedRows) {
    const url = row.external_url ?? signedUrls.get(row.id);
    if (!url) continue;
    const current = result.get(row.pet_id) ?? [];
    current.push({
      id: row.id,
      url,
      mediaType: row.media_type,
      isCover: row.is_cover,
      isAiEdited: row.is_ai_edited,
      sortOrder: row.sort_order,
      alt: `${names.get(row.pet_id) ?? "待認養動物"}${row.is_cover ? "封面照片" : "照片"}`,
    });
    result.set(row.pet_id, current);
  }
  return result;
}

function completeness(pet: RawPublicPet, mediaCount: number): number {
  const values = [
    pet.breed, pet.sex, pet.age_months ?? pet.age_band, pet.region,
    pet.personality_summary, pet.adoption_conditions, pet.sterilized,
    pet.rabies_vaccinated ?? pet.vaccinated, mediaCount > 0, Boolean(pet.tags?.length),
  ];
  return Math.round((values.filter((value) => value !== null && value !== false && value !== "").length / values.length) * 100);
}

function toSummary(pet: RawPublicPet, media: PetMediaView[]): PublicPetSummary {
  const government = pet.source_type === "government";
  const source = government && pet.source_label && pet.source_attribution && pet.dataset_url
    && pet.license_name && pet.license_url && pet.last_seen_at
    ? {
        label: pet.source_label,
        attribution: pet.source_attribution,
        datasetUrl: pet.dataset_url,
        licenseName: pet.license_name,
        licenseUrl: pet.license_url,
        officialReference: pet.official_reference,
        lastSeenAt: pet.last_seen_at,
      }
    : null;
  const officialUrl = pet.official_url ?? pet.dataset_url ?? "https://data.gov.tw/dataset/85903";
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    ageMonths: pet.age_months,
    ageBand: pet.age_band,
    bodySize: pet.body_size,
    region: pet.region,
    status: pet.status,
    sourceType: pet.source_type,
    source,
    freshnessText: government ? freshness(pet.last_seen_at) : null,
    shelter: government
      ? { name: pet.shelter_name, phone: pet.shelter_phone, address: pet.shelter_address }
      : null,
    adoptionAction: government
      ? {
          kind: "shelter_contact",
          phone: pet.shelter_phone,
          address: pet.shelter_address,
          officialUrl,
          adoptionOpenAt: pet.adoption_open_at,
        }
      : { kind: "pawtner_application" },
    personalitySummary: pet.personality_summary,
    temperamentTags: pet.tags?.filter(Boolean) ?? [],
    fosterDisplayName: government ? (pet.shelter_name ?? pet.source_label ?? "政府收容所") : (pet.foster_display_name ?? "合作中途"),
    organization: pet.organization_name
      ? {
          name: pet.organization_name,
          slug: pet.organization_slug,
          isVerified: pet.organization_verified ?? false,
        }
      : null,
    coverMedia: media.find((item) => item.isCover) ?? media[0] ?? null,
    profileCompleteness: completeness(pet, media.length),
    publishedAt: pet.published_at,
  };
}

export async function searchPublicPets(filters: PublicPetSearch = {}): Promise<PublicPetPage> {
  const supabase = createServiceClient();
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 48);
  let query = supabase
    .from("pets_public")
    .select(PUBLIC_SELECT)
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (!getFlag("government_pets")) query = query.eq("source_type", "private_foster");
  if (filters.source) query = query.eq("source_type", filters.source);
  if (filters.species) query = query.eq("species", filters.species);
  if (filters.region?.trim()) query = query.ilike("region", `%${filters.region.trim()}%`);
  if (filters.cursor) query = query.lt("id", filters.cursor);
  if (filters.q?.trim()) {
    const q = filters.q.trim().replaceAll(",", " ");
    query = query.or(`name.ilike.%${q}%,breed.ilike.%${q}%,region.ilike.%${q}%,foster_display_name.ilike.%${q}%,shelter_name.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as RawPublicPet[];
  const visible = rows.slice(0, limit);
  const media = await mediaByPet(supabase, visible);
  return {
    items: visible.map((pet) => toSummary(pet, media.get(pet.id) ?? [])),
    nextCursor: rows.length > limit ? visible.at(-1)?.id ?? null : null,
  };
}

export async function listPublicPets(limit = 48): Promise<PublicPetSummary[]> {
  return (await searchPublicPets({ limit })).items;
}

export async function getPublicPet(id: string): Promise<PublicPetDetail | null> {
  const supabase = createServiceClient();
  let query = supabase.from("pets_public").select(PUBLIC_SELECT).eq("id", id);
  if (!getFlag("government_pets")) query = query.eq("source_type", "private_foster");
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const pet = data as unknown as RawPublicPet;
  const media = (await mediaByPet(supabase, [pet])).get(pet.id) ?? [];
  const { data: health } = pet.source_type === "private_foster"
    ? await supabase
        .from("pet_health_records")
        .select("id,record_date,title,details,is_critical")
        .eq("pet_id", id)
        .order("record_date", { ascending: false })
    : { data: [] };
  const healthRecords: PublicHealthRecord[] = (health ?? []).map((record) => ({
    id: record.id,
    recordDate: record.record_date,
    title: record.title,
    details: record.details,
    isCritical: record.is_critical,
  }));
  const summary = toSummary(pet, media);
  return {
    ...summary,
    weightKg: pet.weight_kg === null ? null : Number(pet.weight_kg),
    color: pet.color,
    foundLocation: pet.found_location,
    sterilized: pet.sterilized,
    microchipped: pet.microchipped,
    vaccinated: pet.vaccinated,
    rabiesVaccinated: pet.rabies_vaccinated,
    dewormed: pet.dewormed,
    specialCare: pet.special_care,
    adoptionConditions: pet.adoption_conditions,
    media,
    healthRecords,
    missingInformation: [
      !pet.age_months && !pet.age_band && "年齡",
      !pet.personality_summary && "個性描述",
      !media.length && "照片",
    ].filter((value): value is string => Boolean(value)),
  };
}
