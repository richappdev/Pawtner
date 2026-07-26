import { describe, expect, it } from "vitest";

import { reviewActionToPatch } from "@/lib/pets/admin-review";

describe("reviewActionToPatch", () => {
  const now = new Date("2026-07-26T08:00:00.000Z");

  it("hides a pet and clears publish fields", () => {
    expect(reviewActionToPatch("hide", "available", now)).toEqual({
      status: "hidden",
      is_published: false,
      published_at: null,
    });
  });

  it("unpublishes without changing status", () => {
    expect(reviewActionToPatch("unpublish", "available", now)).toEqual({
      is_published: false,
      published_at: null,
    });
  });

  it("archives a pet and clears publish fields", () => {
    expect(reviewActionToPatch("archive", "reserved", now)).toEqual({
      status: "archived",
      is_published: false,
      published_at: null,
    });
  });

  it("approves intake pets to available and publishes", () => {
    expect(reviewActionToPatch("approve", "intake", now)).toEqual({
      status: "available",
      is_published: true,
      published_at: now.toISOString(),
    });
  });

  it("approves medical_hold and hidden pets to available", () => {
    expect(reviewActionToPatch("approve", "medical_hold", now).status).toBe("available");
    expect(reviewActionToPatch("approve", "hidden", now).status).toBe("available");
  });

  it("approves already-available pets without changing status", () => {
    expect(reviewActionToPatch("approve", "available", now)).toEqual({
      is_published: true,
      published_at: now.toISOString(),
    });
  });
});
