import type { AdminPetBulkResult } from "@/lib/pets/admin-bulk";

export function remainingSelectedPetIds(
  selected: Iterable<string>,
  results: AdminPetBulkResult[],
) {
  const succeeded = new Set(
    results
      .filter((result) => result.status === "succeeded")
      .map((result) => result.petId),
  );
  return new Set([...selected].filter((petId) => !succeeded.has(petId)));
}
