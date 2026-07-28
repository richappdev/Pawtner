import { describe, expect, it, vi } from "vitest";

import { runAdminPetBulkAction } from "@/lib/pets/admin-bulk";
import { remainingSelectedPetIds } from "@/lib/pets/admin-bulk-selection";

const PRIVATE_ID = "00000000-0000-4000-8000-000000000001";
const GOVERNMENT_ID = "00000000-0000-4000-8000-000000000002";
const INELIGIBLE_ID = "00000000-0000-4000-8000-000000000003";

function supabaseMock() {
  const pets = [
    {
      id: PRIVATE_ID,
      source_type: "private_foster",
      review_status: "pending_review",
      pet_source_records: [],
    },
    {
      id: GOVERNMENT_ID,
      source_type: "government",
      review_status: "approved",
      pet_source_records: [{
        publication_status: "approved",
        quality_status: "clean",
        availability: "open",
        adoption_open_at: null,
        pet_sources: { enabled: true },
      }],
    },
    {
      id: INELIGIBLE_ID,
      source_type: "private_foster",
      review_status: "approved",
      pet_source_records: [],
    },
  ];
  const lookup = {
    select: vi.fn(),
    in: vi.fn().mockResolvedValue({ data: pets, error: null }),
  };
  lookup.select.mockReturnValue(lookup);
  return {
    from: vi.fn(() => lookup),
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

describe("runAdminPetBulkAction", () => {
  it("publishes eligible mixed-source pets and skips ineligible pets", async () => {
    const supabase = supabaseMock();
    const result = await runAdminPetBulkAction(supabase as never, {
      petIds: [PRIVATE_ID, GOVERNMENT_ID, INELIGIBLE_ID],
      action: "publish",
    });

    expect(result.summary).toEqual({ requested: 3, succeeded: 2, skipped: 1, failed: 0 });
    expect(supabase.rpc).toHaveBeenCalledWith("review_pet", expect.objectContaining({
      p_pet_id: PRIVATE_ID,
      p_action: "approve",
    }));
    expect(supabase.rpc).toHaveBeenCalledWith(
      "manage_government_pet_publication",
      expect.objectContaining({ p_pet_id: GOVERNMENT_ID, p_action: "publish" }),
    );
  });

  it("requires a reason only for government pets in a mixed hide request", async () => {
    const supabase = supabaseMock();
    const result = await runAdminPetBulkAction(supabase as never, {
      petIds: [PRIVATE_ID, GOVERNMENT_ID],
      action: "hide",
    });

    expect(result.summary).toEqual({ requested: 2, succeeded: 1, skipped: 1, failed: 0 });
    expect(result.results[1].reason).toContain("必須填寫理由");
  });

  it("keeps skipped and failed rows selected after a partial result", () => {
    const remaining = remainingSelectedPetIds(
      [PRIVATE_ID, GOVERNMENT_ID, INELIGIBLE_ID],
      [
        { petId: PRIVATE_ID, status: "succeeded" },
        { petId: GOVERNMENT_ID, status: "skipped" },
        { petId: INELIGIBLE_ID, status: "failed" },
      ],
    );

    expect([...remaining]).toEqual([GOVERNMENT_ID, INELIGIBLE_ID]);
  });
});
