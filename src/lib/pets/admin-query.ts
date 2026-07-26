import type { SupabaseClient } from "@supabase/supabase-js";

import type { PetSpecies, PetStatus } from "@/lib/schemas/pet";

export interface AdminPetListFilters {
  status?: PetStatus;
  species?: PetSpecies;
  isPublished?: boolean;
  q?: string;
  limit?: number;
}

const FOSTER_SELECT = "display_name, region";
const LIST_SELECT = `*, foster_profiles(${FOSTER_SELECT})`;
const DETAIL_SELECT = `*, foster_profiles(${FOSTER_SELECT}), pet_traits(*), pet_health_records(*), pet_media(*)`;

export async function listAdminPets(supabase: SupabaseClient, filters: AdminPetListFilters = {}) {
  let query = supabase
    .from("pets")
    .select(LIST_SELECT)
    .order("updated_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.species) query = query.eq("species", filters.species);
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
