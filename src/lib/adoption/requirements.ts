import type { PetMatchInput } from "@/lib/matching/score";

export interface PetRequirementRow {
  allows_apartment: boolean | null;
  requires_fenced_yard: boolean | null;
  minimum_home_size_sqm: number | string | null;
  minimum_daily_care_hours: number | string | null;
  requires_medication_ability: boolean | null;
  requires_grooming_ability: boolean | null;
  allows_children: boolean | null;
  allows_dogs: boolean | null;
  energy_level: "low" | "medium" | "high" | null;
  hard_requirements: string[] | null;
}

export interface PetTraitMatchRow {
  energy_level: number | null;
  child_friendly: number | null;
  sociability_dogs: number | null;
}

export function toPetMatchInput(
  requirements: PetRequirementRow | null,
  traits: PetTraitMatchRow | null,
): PetMatchInput {
  const energy = requirements?.energy_level ?? (
    traits?.energy_level == null ? undefined : traits.energy_level <= 2 ? "low" : traits.energy_level >= 4 ? "high" : "medium"
  );
  return {
    mustHave: requirements?.hard_requirements ?? [],
    home: requirements ? {
      requiresFencedYard: requirements.requires_fenced_yard ?? undefined,
      allowsApartment: requirements.allows_apartment ?? undefined,
      minimumHomeSize: requirements.minimum_home_size_sqm == null
        ? undefined : Number(requirements.minimum_home_size_sqm),
    } : undefined,
    time: requirements?.minimum_daily_care_hours == null ? undefined : {
      minimumDailyHours: Number(requirements.minimum_daily_care_hours),
    },
    care: requirements ? {
      needsMedication: requirements.requires_medication_ability ?? undefined,
      needsGrooming: requirements.requires_grooming_ability ?? undefined,
    } : undefined,
    personality: {
      goodWithChildren: requirements?.allows_children ?? (
        traits?.child_friendly == null ? undefined : traits.child_friendly >= 3
      ),
      goodWithDogs: requirements?.allows_dogs ?? (
        traits?.sociability_dogs == null ? undefined : traits.sociability_dogs >= 3
      ),
      energy,
    },
  };
}
