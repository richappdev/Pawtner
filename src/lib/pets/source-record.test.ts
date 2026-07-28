import { describe, expect, it } from "vitest";

import { singleRelatedRecord } from "@/lib/pets/source-record";

describe("singleRelatedRecord", () => {
  it("returns a one-to-one embedded object", () => {
    const record = { publication_status: "pending_review" };
    expect(singleRelatedRecord(record)).toBe(record);
  });

  it("supports legacy array-shaped embeddings", () => {
    const record = { publication_status: "approved" };
    expect(singleRelatedRecord([record])).toBe(record);
  });

  it("returns undefined for a missing relation", () => {
    expect(singleRelatedRecord(null)).toBeUndefined();
    expect(singleRelatedRecord([])).toBeUndefined();
  });
});
