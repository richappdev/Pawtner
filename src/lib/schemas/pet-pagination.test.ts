import { describe, expect, it } from "vitest";

import {
  adminPetBulkActionSchema,
  adminPetPageQuerySchema,
} from "@/lib/schemas/pet";

describe("admin pet pagination query", () => {
  it("defaults to the first page with ten rows", () => {
    const parsed = adminPetPageQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(10);
  });

  it.each([10, 25, 50, 100])("accepts page size %i", (pageSize) => {
    const parsed = adminPetPageQuerySchema.parse({ page: "3", pageSize: String(pageSize) });
    expect(parsed).toMatchObject({ page: 3, pageSize });
  });

  it("falls back for invalid pagination values without dropping valid filters", () => {
    const parsed = adminPetPageQuerySchema.parse({
      page: "-2",
      pageSize: "500",
      species: "dog",
    });
    expect(parsed).toMatchObject({ page: 1, pageSize: 10, species: "dog" });
  });
});

describe("admin pet bulk action request", () => {
  it("deduplicates IDs and enforces the one hundred input limit", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(adminPetBulkActionSchema.parse({ petIds: [id, id], action: "publish" }).petIds).toEqual([id]);

    const tooMany = Array.from(
      { length: 101 },
      (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    expect(adminPetBulkActionSchema.safeParse({ petIds: tooMany, action: "hide" }).success).toBe(false);
  });
});
