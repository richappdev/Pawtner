import { describe, expect, it } from "vitest";

import { sanitizePetForPublic } from "./public";

describe("sanitizePetForPublic", () => {
  it("removes private address fields without mutating public data", () => {
    const pet = {
      id: "pet_1",
      name: "Milo",
      private_address: "123 Hidden Lane",
      privateAddress: "123 Hidden Lane",
    };

    expect(sanitizePetForPublic(pet)).toEqual({ id: "pet_1", name: "Milo" });
    expect(pet.private_address).toBe("123 Hidden Lane");
  });
});
