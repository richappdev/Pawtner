import { describe, expect, it } from "vitest";

import {
  buildMoaOfficialUrl,
  mapMoaAge,
  mapMoaBodySize,
  mapMoaRecord,
  mapMoaSex,
  mapMoaSpecies,
} from "../../../supabase/functions/_shared/moa";

describe("MOA official pet URLs", () => {
  it("builds the government detail URL from the shelter reference", () => {
    const url = new URL(buildMoaOfficialUrl("VAAAG115011910", "臺北市動物之家"));

    expect(url.pathname).toBe("/AnimalApp/AnnounceSingle.aspx");
    expect(url.searchParams.get("PageType")).toBe("Adopt");
    expect(url.searchParams.get("AcNum")).toBe("VkFBQUcxMTUwMTE5MTA=");
    expect(url.searchParams.get("UT")).toBe("VkFBQUc=");
  });

  it("uses the shelter tag for legacy numeric shelter references", () => {
    const url = new URL(buildMoaOfficialUrl("1151382", "宜蘭縣流浪動物中途之家"));

    expect(url.searchParams.get("AcNum")).toBe("MTE1MTM4Mg==");
    expect(url.searchParams.get("UT")).toBe("QkFBQUc=");
  });

  it("falls back to the official adoption list when a detail URL cannot be derived", () => {
    expect(buildMoaOfficialUrl(null, null)).toBe(
      "https://www.pet.gov.tw/AnimalApp/AnnounceMent.aspx?PageType=Adopt",
    );
    expect(buildMoaOfficialUrl("legacy-id", "Unknown shelter")).toBe(
      "https://www.pet.gov.tw/AnimalApp/AnnounceMent.aspx?PageType=Adopt",
    );
  });
});

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
      qualityStatus: "warning",
    });
    expect(mapped?.officialUrl).toBe(
      "https://www.pet.gov.tw/AnimalApp/AnnounceSingle.aspx?PageType=Adopt&AcNum=VEFJUEVJLTQy&UT=VkFBQUc%3D",
    );
    expect(mapped?.issues.map((issue) => issue.code)).toContain("missing_breed");
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
    expect(mapped?.qualityStatus).toBe("blocked");
    expect(mapped?.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "missing_shelter_phone", severity: "blocker" }),
      expect.objectContaining({ code: "missing_or_invalid_image", severity: "warning" }),
    ]));
  });

  it("blocks invalid non-empty adoption dates", async () => {
    const mapped = await mapMoaRecord({
      animal_id: 8,
      animal_kind: "狗",
      animal_status: "OPEN",
      animal_opendate: "not-a-date",
      shelter_name: "測試收容所",
      shelter_tel: "02-12345678",
      shelter_address: "臺北市",
    });

    expect(mapped?.qualityStatus).toBe("blocked");
    expect(mapped?.issues).toContainEqual(expect.objectContaining({
      code: "invalid_adoption_open_date",
      severity: "blocker",
    }));
  });

  it("skips rows without a government animal id", async () => {
    await expect(mapMoaRecord({ animal_id: "  " })).resolves.toBeNull();
  });
});
