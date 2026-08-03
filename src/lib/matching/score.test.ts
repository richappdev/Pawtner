import { describe, expect, it } from "vitest";

import { scoreMatch } from "./score";

describe("scoreMatch", () => {
  it("blocks a match when a must-have fails despite strong other scores", () => {
    const result = scoreMatch(
      {
        mustHave: ["experienced medication care"],
        home: { requiresFencedYard: true, allowsApartment: false, minimumHomeSize: 100 },
        time: { minimumDailyHours: 3 },
        care: { needsMedication: true, needsGrooming: true },
        personality: { goodWithChildren: false, goodWithDogs: false, energy: "high" },
      },
      {
        supportedMustHaves: [],
        home: { hasFencedYard: true, isApartment: false, homeSize: 150 },
        time: { dailyHoursAvailable: 4 },
        care: { canAdministerMedication: true, canProvideGrooming: true },
        personality: { hasChildren: false, hasDogs: false, preferredEnergy: ["high"] },
      },
    );

    expect(result).toMatchObject({ eligible: false, score: 0 });
    expect(result.risks).toContain("Missing required capability: experienced medication care.");
  });

  it("returns a high eligible score for a compatible household", () => {
    const result = scoreMatch(
      { mustHave: ["adult household"], time: { minimumDailyHours: 2 }, care: { needsGrooming: true } },
      {
        supportedMustHaves: ["adult household"],
        time: { dailyHoursAvailable: 3 },
        care: { canProvideGrooming: true },
      },
    );

    expect(result).toMatchObject({ eligible: true, score: 100 });
  });

  it("keeps category breakdown values as percentages", () => {
    const result = scoreMatch(
      { mustHave: [], home: { requiresFencedYard: true } },
      { supportedMustHaves: [], home: { hasFencedYard: false } },
    );

    expect(Object.values(result.breakdown).every((value) => value >= 0 && value <= 100)).toBe(true);
    expect(result.score).toBe(0);
    expect(result.evaluatedCriteria).toBe(1);
  });

  it("returns a null score when the pet has no usable matching evidence", () => {
    const result = scoreMatch(
      { mustHave: [] },
      { supportedMustHaves: [] },
    );

    expect(result).toMatchObject({
      score: null,
      eligible: true,
      evaluatedCriteria: 0,
      breakdown: {},
    });
  });
});
