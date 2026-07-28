import { describe, expect, it, vi } from "vitest";

import { listAdminPets } from "@/lib/pets/admin-query";

function queryMock() {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null, count: 243 }),
  };
  for (const method of ["select", "order", "range", "eq", "or"] as const) {
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
});
