import { z } from "zod";

import type { AdopterMatchInput, EnergyLevel } from "@/lib/matching/score";

export const questionnaireV2AnswersSchema = z.object({
  housing_type: z.enum(["apartment", "house", "shared"]),
  usable_home_size_sqm: z.number().positive().max(2_000),
  has_fenced_yard: z.boolean(),
  daily_care_hours: z.number().min(0).max(24),
  has_children: z.boolean(),
  has_dogs: z.boolean(),
  can_administer_medication: z.boolean(),
  can_provide_grooming: z.boolean(),
  preferred_energy_levels: z.array(z.enum(["low", "medium", "high"])).min(1),
});

export type QuestionnaireV2Answers = z.infer<typeof questionnaireV2AnswersSchema>;

export function questionnaireCompleteness(value: unknown): number {
  const parsed = questionnaireV2AnswersSchema.safeParse(value);
  if (parsed.success) return 100;
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const answers = value as Record<string, unknown>;
  const keys = Object.keys(questionnaireV2AnswersSchema.shape);
  return Math.round((keys.filter((key) => answers[key] !== undefined).length / keys.length) * 100);
}

export function toAdopterMatchInput(answers: QuestionnaireV2Answers): AdopterMatchInput {
  const supportedMustHaves = [
    answers.can_administer_medication && "medication",
    answers.can_provide_grooming && "grooming",
    !answers.has_children && "no_children",
    !answers.has_dogs && "no_dogs",
  ].filter((value): value is string => Boolean(value));
  return {
    supportedMustHaves,
    home: {
      hasFencedYard: answers.has_fenced_yard,
      isApartment: answers.housing_type === "apartment",
      homeSize: answers.usable_home_size_sqm,
    },
    time: { dailyHoursAvailable: answers.daily_care_hours },
    care: {
      canAdministerMedication: answers.can_administer_medication,
      canProvideGrooming: answers.can_provide_grooming,
    },
    personality: {
      hasChildren: answers.has_children,
      hasDogs: answers.has_dogs,
      preferredEnergy: answers.preferred_energy_levels as EnergyLevel[],
    },
  };
}
