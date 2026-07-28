import type { SupabaseClient } from "@supabase/supabase-js";

import type { PetSourceType, PetSpecies, PetStatus } from "@/lib/schemas/pet";

export interface AdminPetListFilters {
  status?: PetStatus;
  species?: PetSpecies;
  source?: PetSourceType;
  isPublished?: boolean;
  q?: string;
  limit?: number;
}

const FOSTER_SELECT = "display_name, region";
const LIST_SELECT = `*, foster_profiles(${FOSTER_SELECT}), pet_source_records(external_sub_id,shelter_name,last_seen_at,availability)`;
const DETAIL_SELECT = `*, foster_profiles(${FOSTER_SELECT}), pet_traits(*), pet_health_records(*), pet_media(*), pet_source_records(external_sub_id,shelter_id,shelter_name,shelter_address,shelter_phone,official_url,adoption_open_at,source_created_at,source_updated_at,last_seen_at,availability,pet_sources(dataset_name,attribution,dataset_url,license_name,license_url)), pet_editorial_overrides(display_name,personality_summary,special_care,adoption_conditions,tags,is_hidden,updated_at)`;

export async function listAdminPets(supabase: SupabaseClient, filters: AdminPetListFilters = {}) {
  let query = supabase
    .from("pets")
    .select(LIST_SELECT)
    .order("updated_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.species) query = query.eq("species", filters.species);
  if (filters.source) query = query.eq("source_type", filters.source);
  if (filters.isPublished !== undefined) query = query.eq("is_published", filters.isPublished);
  if (filters.q?.trim()) {
    const q = filters.q.trim().replaceAll(",", " ");
    query = query.or(`name.ilike.%${q}%,region.ilike.%${q}%`);
  }

  return query;
}

export async function getAdminPet(supabase: SupabaseClient, id: string) {
  return supabase.from("pets").select(DETAIL_SELECT).eq("id", id).maybeSingle();
}
