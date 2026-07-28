import { describe, expect, it } from "vitest";

import {
  mapMoaAge,
  mapMoaBodySize,
  mapMoaRecord,
  mapMoaSex,
  mapMoaSpecies,
} from "../../../supabase/functions/_shared/moa";

describe("MOA pet mapping", () => {
  it("maps every documented code family", () => {
    expect(mapMoaSpecies("狗")).toBe("dog");
    expect(mapMoaSpecies("貓")).toBe("cat");
    expect(mapMoaSpecies("其他")).toBe("other");
    expect(mapMoaSex("M")).toBe("male");
    expect(mapMoaSex("F")).toBe("female");
    expect(mapMoaSex("")).toBe("unknown");
    expect(mapMoaAge("CHILD")).toBe("child");
    expect(mapMoaAge("ADULT")).toBe("adult");
    expect(mapMoaBodySize("SMALL")).toBe("small");
    expect(mapMoaBodySize("MEDIUM")).toBe("medium");
    expect(mapMoaBodySize("BIG")).toBe("large");
  });

  it("normalizes whitespace, nullable booleans, fallback titles, and source metadata", async () => {
    const mapped = await mapMoaRecord({
      animal_id: " 42 ",
      animal_subid: " TAIPEI-42 ",
      animal_kind: "狗",
      animal_sex: "M",
      animal_age: "CHILD",
      animal_bodytype: "SMALL",
      animal_status: "OPEN",
      animal_sterilization: "T",
      animal_bacterin: "F",
      shelter_address: "臺北市信義區",
      shelter_name: "臺北市動物之家",
      shelter_tel: "02-12345678",
      album_file: "https://www.pet.gov.tw/upload/pic/example.jpg",
    }, new Date("2026-07-28T00:00:00Z"));

    expect(mapped).toMatchObject({
      externalId: "42",
      name: "待認養犬 · TAIPEI-42",
      species: "dog",
      sex: "male",
      ageBand: "child",
      bodySize: "small",
      region: "臺北市",
      sterilized: true,
      rabiesVaccinated: false,
      publishEligible: true,
      availability: "open",
    });
    expect(mapped?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("holds future OPEN records and rejects non-allow-listed images", async () => {
    const mapped = await mapMoaRecord({
      animal_id: 7,
      animal_kind: "貓",
      animal_status: "OPEN",
      animal_opendate: "2026-08-01 00:00:00",
      album_file: "https://example.com/cat.jpg",
    }, new Date("2026-07-28T00:00:00Z"));

    expect(mapped?.publishEligible).toBe(false);
    expect(mapped?.availability).toBe("future");
    expect(mapped?.imageUrl).toBeNull();
  });

  it("skips rows without a government animal id", async () => {
    await expect(mapMoaRecord({ animal_id: "  " })).resolves.toBeNull();
  });
});
