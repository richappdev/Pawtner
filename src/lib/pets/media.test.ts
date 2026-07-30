import { describe, expect, it } from "vitest";

import {
  orderUploadedPetPhotos,
  selectPublicPetMediaRows,
  type PetMediaRow,
} from "@/lib/pets/media";

function row(overrides: Partial<PetMediaRow> & Pick<PetMediaRow, "id">): PetMediaRow {
  return {
    pet_id: "pet-1",
    storage_path: null,
    external_url: null,
    media_type: "image",
    is_cover: false,
    is_ai_edited: false,
    is_public: true,
    sort_order: 0,
    ...overrides,
  };
}

describe("pet media selection", () => {
  it("uses uploaded photos and omits the government fallback when uploads exist", () => {
    const selected = selectPublicPetMediaRows(
      [
        row({ id: "government", external_url: "https://www.pet.gov.tw/upload/pic/pet.jpg", is_cover: true }),
        row({ id: "second", storage_path: "pet-1/second.webp", sort_order: 0 }),
        row({ id: "cover", storage_path: "pet-1/cover.webp", sort_order: 1, is_cover: true }),
      ],
      "government",
    );

    expect(selected.map((item) => item.id)).toEqual(["cover", "second"]);
  });

  it("uses the government image only when no uploaded public photo exists", () => {
    const selected = selectPublicPetMediaRows(
      [
        row({ id: "government", external_url: "https://www.pet.gov.tw/upload/pic/pet.jpg", is_cover: true }),
        row({ id: "private-upload", storage_path: "pet-1/private.webp", is_public: false }),
      ],
      "government",
    );

    expect(selected.map((item) => item.id)).toEqual(["government"]);
  });

  it("falls back to display order when uploaded data has no cover", () => {
    const ordered = orderUploadedPetPhotos([
      row({ id: "later", storage_path: "pet-1/later.webp", sort_order: 4 }),
      row({ id: "first", storage_path: "pet-1/first.webp", sort_order: 1 }),
    ]);

    expect(ordered.map((item) => item.id)).toEqual(["first", "later"]);
  });

  it("caps the selected uploaded gallery at five photos", () => {
    const selected = selectPublicPetMediaRows(
      Array.from({ length: 6 }, (_, index) =>
        row({ id: `photo-${index}`, storage_path: `pet-1/${index}.webp`, sort_order: index }),
      ),
      "private_foster",
    );

    expect(selected).toHaveLength(5);
  });

  it("does not use an external fallback for a private pet", () => {
    const selected = selectPublicPetMediaRows(
      [row({ id: "external", external_url: "https://www.pet.gov.tw/upload/pic/pet.jpg" })],
      "private_foster",
    );

    expect(selected).toEqual([]);
  });
});
