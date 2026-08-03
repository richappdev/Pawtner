import { describe, expect, it } from "vitest";

import { createdAtCursorFilter, decodeCreatedAtCursor, encodeCreatedAtCursor } from "./cursor";

describe("created-at cursor", () => {
  const value = { createdAt: "2026-08-03T01:02:03.000Z", id: "8f200000-0000-4000-8000-000000000001" };

  it("round trips an opaque cursor", () => {
    expect(decodeCreatedAtCursor(encodeCreatedAtCursor(value))).toEqual(value);
  });

  it("rejects malformed cursors", () => {
    expect(decodeCreatedAtCursor("not-a-cursor")).toBeNull();
  });

  it("builds a stable compound keyset filter", () => {
    expect(createdAtCursorFilter(value)).toContain("created_at.lt.2026-08-03T01:02:03.000Z");
    expect(createdAtCursorFilter(value)).toContain(`id.lt.${value.id}`);
  });
});
