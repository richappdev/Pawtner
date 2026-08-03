import { describe, expect, it } from "vitest";

import { questionnaireCompleteness, questionnaireV2AnswersSchema, toAdopterMatchInput } from "./questionnaire";

const complete = {
  housing_type: "apartment" as const,
  usable_home_size_sqm: 42,
  has_fenced_yard: false,
  daily_care_hours: 3,
  has_children: false,
  has_dogs: true,
  can_administer_medication: true,
  can_provide_grooming: false,
  preferred_energy_levels: ["low", "medium"] as const,
};

describe("questionnaire v2", () => {
  it("accepts all rule-engine fields and reports completeness", () => {
    expect(questionnaireV2AnswersSchema.safeParse(complete).success).toBe(true);
    expect(questionnaireCompleteness(complete)).toBe(100);
  });

  it("rejects missing and out-of-range care data", () => {
    expect(questionnaireV2AnswersSchema.safeParse({ ...complete, daily_care_hours: 25 }).success).toBe(false);
    expect(questionnaireCompleteness({ housing_type: "house" })).toBe(11);
  });

  it("adapts answers without deriving constraints from prose", () => {
    expect(toAdopterMatchInput(questionnaireV2AnswersSchema.parse(complete))).toMatchObject({
      supportedMustHaves: ["medication", "no_children"],
      home: { isApartment: true, homeSize: 42 },
      personality: { hasDogs: true, preferredEnergy: ["low", "medium"] },
    });
  });
});
