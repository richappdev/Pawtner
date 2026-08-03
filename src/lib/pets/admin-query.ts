import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PetSourcePublicationStatus,
  PetSourceQualityStatus,
  PetSourceType,
  PetReviewStatus,
  PetSpecies,
  PetStatus,
} from "@/lib/schemas/pet";

export interface AdminPetListFilters {
  status?: PetStatus;
  species?: PetSpecies;
  source?: PetSourceType;
  reviewStatus?: PetReviewStatus;
  qualityStatus?: PetSourceQualityStatus;
  publicationStatus?: PetSourcePublicationStatus;
  isPublished?: boolean;
  q?: string;
  region?: string;
  limit?: number;
  offset?: number;
}

const FOSTER_SELECT = "display_name, region";
const SOURCE_RECORD_FIELDS = "external_sub_id,shelter_name,last_seen_at,availability,quality_status,publication_status,hold_reason";
const DETAIL_SELECT = `*, foster_profiles(${FOSTER_SELECT}), pet_traits(*), pet_health_records(*), pet_media(*), pet_source_record_issues(*), pet_publication_events(*), pet_source_records(external_sub_id,shelter_id,shelter_name,shelter_address,shelter_phone,official_url,adoption_open_at,source_created_at,source_updated_at,last_seen_at,availability,quality_status,publication_status,reviewed_at,approved_at,hold_reason,last_validated_at,pet_sources(dataset_name,attribution,dataset_url,license_name,license_url)), pet_editorial_overrides(display_name,personality_summary,special_care,adoption_conditions,tags,is_hidden,updated_at)`;

export async function listAdminPets(supabase: SupabaseClient, filters: AdminPetListFilters = {}) {
  const filterSourceRecords = Boolean(filters.qualityStatus || filters.publicationStatus);
  const listSelect = `*, foster_profiles(${FOSTER_SELECT}), pet_source_records${filterSourceRecords ? "!inner" : ""}(${SOURCE_RECORD_FIELDS})`;
  const limit = filters.limit ?? 200;
  const offset = filters.offset ?? 0;

  let query = supabase
    .from("pets")
    .select(listSelect, { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.species) query = query.eq("species", filters.species);
  if (filters.source) query = query.eq("source_type", filters.source);
  if (filters.reviewStatus) query = query.eq("review_status", filters.reviewStatus);
  if (filters.isPublished !== undefined) query = query.eq("is_published", filters.isPublished);
  if (filters.qualityStatus) {
    query = query.eq("pet_source_records.quality_status", filters.qualityStatus);
  }
  if (filters.publicationStatus) {
    query = query.eq("pet_source_records.publication_status", filters.publicationStatus);
  }
  if (filters.region?.trim()) {
    query = query.eq("region", filters.region.trim());
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().replaceAll(",", " ");
    query = query.or(`name.ilike.%${q}%,region.ilike.%${q}%`);
  }

  return query;
}

export async function listAdminPetRegions(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("region")
    .not("region", "is", null);

  if (error || !data) return [];

  return [...new Set(
    data
      .map((row) => (typeof row.region === "string" ? row.region.trim() : ""))
      .filter((region) => region.length > 0),
  )].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

export async function getAdminPet(supabase: SupabaseClient, id: string) {
  return supabase.from("pets").select(DETAIL_SELECT).eq("id", id).maybeSingle();
}
