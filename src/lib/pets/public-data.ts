import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PetMediaView,
  PublicHealthRecord,
  PublicPetDetail,
  PublicPetSummary,
} from "@/lib/pets/public-types";
import type { PetSpecies, PetStatus } from "@/lib/schemas/pet";
import { createServiceClient } from "@/lib/supabase/server";

const PUBLIC_STATUSES: PetStatus[] = [
  "available",
  "application_pending",
  "reserved",
  "trial_adoption",
];
const MEDIA_BUCKET = "pet-media";

type RawMedia = {
  id: string;
  storage_path: string;
  media_type: "image" | "video";
  is_cover: boolean;
  is_ai_edited: boolean;
  is_public: boolean;
  sort_order: number;
};

type RawHealth = {
  id: string;
  record_date: string;
  title: string;
  details: string | null;
  is_critical: boolean;
};

type RawPublicPet = {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  sex: "male" | "female" | "unknown" | null;
  age_months: number | null;
  weight_kg: number | string | null;
  color: string | null;
  region: string | null;
  status: PetStatus;
  sterilized: boolean | null;
  microchipped: boolean | null;
  vaccinated: boolean | null;
  dewormed: boolean | null;
  personality_summary: string | null;
  special_care: string | null;
  adoption_conditions: string | null;
  published_at: string | null;
  foster_profiles:
    | {
        display_name: string;
        organizations:
          | { name: string; slug: string | null; is_verified: boolean }
          | Array<{ name: string; slug: string | null; is_verified: boolean }>
          | null;
      }
    | Array<{
        display_name: string;
        organizations:
          | { name: string; slug: string | null; is_verified: boolean }
          | Array<{ name: string; slug: string | null; is_verified: boolean }>
          | null;
      }>
    | null;
  pet_traits: { tags: string[] | null } | Array<{ tags: string[] | null }> | null;
  pet_media: RawMedia[] | null;
  pet_health_records: RawHealth[] | null;
};

const PUBLIC_SELECT = `
  id,name,species,breed,sex,age_months,weight_kg,color,region,status,
  sterilized,microchipped,vaccinated,dewormed,personality_summary,special_care,
  adoption_conditions,published_at,
  foster_profiles(display_name,organizations(name,slug,is_verified)),
  pet_traits(tags),
  pet_media(id,storage_path,media_type,is_cover,is_ai_edited,is_public,sort_order),
  pet_health_records(id,record_date,title,details,is_critical)
`;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function resolveMedia(
  supabase: SupabaseClient,
  petName: string,
  media: RawMedia[],
): Promise<PetMediaView[]> {
  const publicMedia = media
    .filter((item) => item.is_public)
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
  if (!publicMedia.length) return [];

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(publicMedia.map((item) => item.storage_path), 60 * 60);
  if (error || !data) return [];

  return publicMedia.flatMap((item, index) => {
    const url = data[index]?.signedUrl;
    if (!url) return [];
    return [{
      id: item.id,
      url,
      mediaType: item.media_type,
      isCover: item.is_cover,
      isAiEdited: item.is_ai_edited,
      sortOrder: item.sort_order,
      alt: `${petName}的${item.is_cover ? "主要照片" : "生活照片"}`,
    }];
  });
}

function completeness(pet: RawPublicPet, mediaCount: number, tags: string[]): number {
  const values = [
    pet.breed,
    pet.sex,
    pet.age_months,
    pet.region,
    pet.personality_summary,
    pet.adoption_conditions,
    pet.sterilized,
    pet.vaccinated,
    mediaCount > 0,
    tags.length > 0,
  ];
  return Math.round((values.filter((value) => value !== null && value !== false && value !== "").length / values.length) * 100);
}

async function toDetail(supabase: SupabaseClient, pet: RawPublicPet): Promise<PublicPetDetail> {
  const foster = first(pet.foster_profiles);
  const organization = first(foster?.organizations);
  const traits = first(pet.pet_traits);
  const tags = traits?.tags?.filter(Boolean) ?? [];
  const media = await resolveMedia(supabase, pet.name, pet.pet_media ?? []);
  const healthRecords: PublicHealthRecord[] = (pet.pet_health_records ?? [])
    .sort((a, b) => b.record_date.localeCompare(a.record_date))
    .map((record) => ({
      id: record.id,
      recordDate: record.record_date,
      title: record.title,
      details: record.details,
      isCritical: record.is_critical,
    }));
  const missingInformation = [
    !pet.age_months && "年齡",
    !pet.weight_kg && "體重",
    !pet.personality_summary && "個性觀察",
    !pet.adoption_conditions && "適合家庭",
    !media.length && "生活照片",
  ].filter((value): value is string => Boolean(value));

  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    ageMonths: pet.age_months,
    weightKg: pet.weight_kg === null ? null : Number(pet.weight_kg),
    color: pet.color,
    region: pet.region,
    status: pet.status,
    sterilized: pet.sterilized,
    microchipped: pet.microchipped,
    vaccinated: pet.vaccinated,
    dewormed: pet.dewormed,
    personalitySummary: pet.personality_summary,
    specialCare: pet.special_care,
    adoptionConditions: pet.adoption_conditions,
    temperamentTags: tags,
    fosterDisplayName: foster?.display_name ?? "合作中途",
    organization: organization
      ? { name: organization.name, slug: organization.slug, isVerified: organization.is_verified }
      : null,
    coverMedia: media.find((item) => item.isCover) ?? media[0] ?? null,
    media,
    healthRecords,
    profileCompleteness: completeness(pet, media.length, tags),
    publishedAt: pet.published_at,
    missingInformation,
  };
}

export async function listPublicPets(limit = 48): Promise<PublicPetSummary[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("pets")
    .select(PUBLIC_SELECT)
    .eq("review_status", "approved")
    .eq("is_published", true)
    .in("status", PUBLIC_STATUSES)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return Promise.all(
    ((data ?? []) as unknown as RawPublicPet[]).map(async (pet) => {
      const detail = await toDetail(supabase, pet);
      return {
        id: detail.id,
        name: detail.name,
        species: detail.species,
        breed: detail.breed,
        sex: detail.sex,
        ageMonths: detail.ageMonths,
        region: detail.region,
        status: detail.status,
        personalitySummary: detail.personalitySummary,
        temperamentTags: detail.temperamentTags,
        fosterDisplayName: detail.fosterDisplayName,
        organization: detail.organization,
        coverMedia: detail.coverMedia,
        profileCompleteness: detail.profileCompleteness,
        publishedAt: detail.publishedAt,
      };
    }),
  );
}

export async function getPublicPet(id: string): Promise<PublicPetDetail | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("pets")
    .select(PUBLIC_SELECT)
    .eq("id", id)
    .eq("review_status", "approved")
    .eq("is_published", true)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle();
  if (error) throw error;
  return data ? toDetail(supabase, data as unknown as RawPublicPet) : null;
}
