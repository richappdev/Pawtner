import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminPetBulkActionInput } from "@/lib/schemas/pet";

export type AdminPetBulkResultStatus = "succeeded" | "skipped" | "failed";

export interface AdminPetBulkResult {
  petId: string;
  status: AdminPetBulkResultStatus;
  reason?: string;
}

interface BulkPet {
  id: string;
  source_type: "private_foster" | "government";
  review_status: string;
  pet_source_records?: Array<{
    publication_status: string;
    quality_status: string;
    availability: string;
    adoption_open_at: string | null;
    pet_sources?: { enabled?: boolean } | null;
  }> | null;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => runWorker()),
  );
  return results;
}

function publishIneligibility(pet: BulkPet, now: Date) {
  if (pet.source_type === "private_foster") {
    return pet.review_status === "pending_review"
      ? null
      : "只有待審核的中途毛孩可以批次刊登。";
  }

  const source = pet.pet_source_records?.[0];
  if (!source) return "找不到政府來源紀錄。";
  if (source.publication_status !== "approved") return "政府資料必須先通過核准。";
  if (source.quality_status === "blocked") return "資料品質為 blocked，無法刊登。";
  if (source.availability !== "open") return "政府來源目前未開放認養。";
  if (source.adoption_open_at && new Date(source.adoption_open_at) > now) {
    return "尚未到認養開放時間。";
  }
  if (source.pet_sources?.enabled === false) return "政府資料來源目前停用。";
  return null;
}

export async function runAdminPetBulkAction(
  supabase: SupabaseClient,
  input: AdminPetBulkActionInput,
  now = new Date(),
) {
  const { data, error } = await supabase
    .from("pets")
    .select(
      "id,source_type,review_status,pet_source_records(publication_status,quality_status,availability,adoption_open_at,pet_sources(enabled))",
    )
    .in("id", input.petIds);

  if (error) throw error;

  const petsById = new Map(
    ((data ?? []) as unknown as BulkPet[]).map((pet) => [pet.id, pet]),
  );

  const results = await mapWithConcurrency(input.petIds, 5, async (petId) => {
    const pet = petsById.get(petId);
    if (!pet) {
      return { petId, status: "skipped", reason: "找不到毛孩資料。" } satisfies AdminPetBulkResult;
    }

    if (input.action === "publish") {
      const reason = publishIneligibility(pet, now);
      if (reason) return { petId, status: "skipped", reason } satisfies AdminPetBulkResult;
    }

    if (input.action === "hide" && pet.source_type === "government" && !input.reason) {
      return {
        petId,
        status: "skipped",
        reason: "隱藏政府來源毛孩時必須填寫理由。",
      } satisfies AdminPetBulkResult;
    }

    const rpc = pet.source_type === "government"
      ? await supabase.rpc("manage_government_pet_publication", {
          p_pet_id: petId,
          p_action: input.action === "publish" ? "publish" : "unpublish",
          p_reason: input.action === "hide" ? input.reason ?? null : null,
        })
      : await supabase.rpc("review_pet", {
          p_pet_id: petId,
          p_action: input.action === "publish" ? "approve" : "hide",
          p_note: input.action === "hide" ? input.reason ?? null : null,
        });

    return rpc.error
      ? {
          petId,
          status: "failed",
          reason: "操作期間資料狀態已變更，請重新整理後再試。",
        } satisfies AdminPetBulkResult
      : { petId, status: "succeeded" } satisfies AdminPetBulkResult;
  });

  return {
    results,
    summary: {
      requested: results.length,
      succeeded: results.filter((result) => result.status === "succeeded").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      failed: results.filter((result) => result.status === "failed").length,
    },
  };
}
