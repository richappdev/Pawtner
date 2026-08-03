import { describe, expect, it, vi } from "vitest";

import { listAdminPetRegions, listAdminPets } from "@/lib/pets/admin-query";

function queryMock() {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    not: vi.fn(),
    then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null, count: 243 }),
  };
  for (const method of ["select", "order", "range", "eq", "or", "not"] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

describe("listAdminPets", () => {
  it("uses an exact count, stable ordering, and a zero-based page range", async () => {
    const query = queryMock();
    const supabase = { from: vi.fn(() => query) };

    const result = await listAdminPets(supabase as never, { limit: 25, offset: 50 });

    expect(result.count).toBe(243);
    expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: "exact" });
    expect(query.order).toHaveBeenNthCalledWith(1, "updated_at", { ascending: false });
    expect(query.order).toHaveBeenNthCalledWith(2, "id", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(50, 74);
  });

  it("filters source-record fields with an inner relation and no ID prefetch cap", async () => {
    const query = queryMock();
    const supabase = { from: vi.fn(() => query) };

    await listAdminPets(supabase as never, {
      qualityStatus: "clean",
      publicationStatus: "approved",
      limit: 100,
    });

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(query.select.mock.calls[0][0]).toContain("pet_source_records!inner");
    expect(query.eq).toHaveBeenCalledWith("pet_source_records.quality_status", "clean");
    expect(query.eq).toHaveBeenCalledWith("pet_source_records.publication_status", "approved");
  });

  it("filters by exact region", async () => {
    const query = queryMock();
    const supabase = { from: vi.fn(() => query) };

    await listAdminPets(supabase as never, { region: "臺北市" });

    expect(query.eq).toHaveBeenCalledWith("region", "臺北市");
  });

  it("filters private pets by review status", async () => {
    const query = queryMock();
    const supabase = { from: vi.fn(() => query) };

    await listAdminPets(supabase as never, { reviewStatus: "pending_review" });

    expect(query.eq).toHaveBeenCalledWith("review_status", "pending_review");
  });
});

describe("listAdminPetRegions", () => {
  it("returns sorted distinct non-empty regions", async () => {
    const query = {
      select: vi.fn(),
      not: vi.fn(),
      then: (resolve: (value: unknown) => void) => resolve({
        data: [
          { region: "新北市" },
          { region: "臺北市" },
          { region: "新北市" },
          { region: "  " },
          { region: null },
        ],
        error: null,
      }),
    };
    query.select.mockReturnValue(query);
    query.not.mockReturnValue(query);
    const supabase = { from: vi.fn(() => query) };

    const regions = await listAdminPetRegions(supabase as never);

    expect(query.select).toHaveBeenCalledWith("region");
    expect(query.not).toHaveBeenCalledWith("region", "is", null);
    expect(regions).toEqual(["新北市", "臺北市"]);
  });
});
