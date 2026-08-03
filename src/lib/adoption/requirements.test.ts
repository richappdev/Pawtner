import { describe, expect, it } from "vitest";

import { toPetMatchInput } from "./requirements";

describe("pet match requirements adapter", () => {
  it("uses structured requirements and traits", () => {
    expect(toPetMatchInput({
      allows_apartment: false,
      requires_fenced_yard: true,
      minimum_home_size_sqm: "80",
      minimum_daily_care_hours: "2.5",
      requires_medication_ability: true,
      requires_grooming_ability: false,
      allows_children: false,
      allows_dogs: true,
      energy_level: null,
      hard_requirements: ["medication"],
    }, { energy_level: 5, child_friendly: 1, sociability_dogs: 4 })).toMatchObject({
      mustHave: ["medication"],
      home: { allowsApartment: false, minimumHomeSize: 80 },
      time: { minimumDailyHours: 2.5 },
      personality: { goodWithChildren: false, goodWithDogs: true, energy: "high" },
    });
  });

  it("does not invent evidence when structured data is absent", () => {
    const result = toPetMatchInput(null, null);
    expect(result.mustHave).toEqual([]);
    expect(result.home).toBeUndefined();
    expect(result.personality).toEqual({ goodWithChildren: undefined, goodWithDogs: undefined, energy: undefined });
  });
});
