export type EnergyLevel = "low" | "medium" | "high";

export interface PetMatchInput {
  mustHave: readonly string[];
  home?: {
    requiresFencedYard?: boolean;
    allowsApartment?: boolean;
    minimumHomeSize?: number;
  };
  time?: { minimumDailyHours?: number };
  care?: {
    needsMedication?: boolean;
    needsGrooming?: boolean;
  };
  personality?: {
    goodWithChildren?: boolean;
    goodWithDogs?: boolean;
    energy?: EnergyLevel;
  };
}

export interface AdopterMatchInput {
  supportedMustHaves: readonly string[];
  home?: {
    hasFencedYard?: boolean;
    isApartment?: boolean;
    homeSize?: number;
  };
  time?: { dailyHoursAvailable?: number };
  care?: {
    canAdministerMedication?: boolean;
    canProvideGrooming?: boolean;
  };
  personality?: {
    hasChildren?: boolean;
    hasDogs?: boolean;
    preferredEnergy?: readonly EnergyLevel[];
  };
}

export interface MatchResult {
  score: number;
  eligible: boolean;
  reasons: string[];
  risks: string[];
  questions: string[];
  breakdown: Record<string, number>;
}

const WEIGHTS = {
  mustHave: 30,
  home: 25,
  time: 20,
  care: 15,
  personality: 10,
} as const;

interface CategoryResult {
  score: number;
  reasons: string[];
  risks: string[];
  questions: string[];
}

function percentage(matches: boolean[]): number {
  if (matches.length === 0) {
    return 100;
  }

  return Math.round((matches.filter(Boolean).length / matches.length) * 100);
}

function categoryResult(
  checks: Array<{ passes: boolean; success: string; risk: string; question?: string }>,
): CategoryResult {
  return {
    score: percentage(checks.map((check) => check.passes)),
    reasons: checks.filter((check) => check.passes).map((check) => check.success),
    risks: checks.filter((check) => !check.passes).map((check) => check.risk),
    questions: checks.filter((check) => !check.passes && check.question).flatMap((check) => check.question ?? []),
  };
}

export function scoreMatch(pet: PetMatchInput, adopter: AdopterMatchInput): MatchResult {
  const missingMustHaves = pet.mustHave.filter((requirement) => !adopter.supportedMustHaves.includes(requirement));
  const mustHave: CategoryResult = {
    score: missingMustHaves.length === 0 ? 100 : 0,
    reasons: missingMustHaves.length === 0
      ? ["All non-negotiable requirements are supported."]
      : [],
    risks: missingMustHaves.map((requirement) => `Missing required capability: ${requirement}.`),
    questions: missingMustHaves.map((requirement) => `Can you support this requirement: ${requirement}?`),
  };

  const home = categoryResult([
    ...(pet.home?.requiresFencedYard === true
      ? [{
          passes: adopter.home?.hasFencedYard === true,
          success: "The adopter has the required fenced yard.",
          risk: "A fenced yard is required but not confirmed.",
          question: "Is there a secure fenced yard?",
        }]
      : []),
    ...(pet.home?.allowsApartment === false
      ? [{
          passes: adopter.home?.isApartment !== true,
          success: "The home is suitable for a non-apartment placement.",
          risk: "This pet is not suited to apartment living.",
          question: "Is the home an apartment?",
        }]
      : []),
    ...(pet.home?.minimumHomeSize !== undefined
      ? [{
          passes: (adopter.home?.homeSize ?? 0) >= pet.home.minimumHomeSize,
          success: "The home meets the minimum size requirement.",
          risk: "The home size may be below the requirement.",
          question: "What is the usable home size?",
        }]
      : []),
  ]);

  const time = categoryResult(pet.time?.minimumDailyHours !== undefined
    ? [{
        passes: (adopter.time?.dailyHoursAvailable ?? 0) >= pet.time.minimumDailyHours,
        success: "The adopter can provide the required daily time.",
        risk: "Available daily time may not meet this pet's needs.",
        question: "How many hours each day can you dedicate to care and interaction?",
      }]
    : []);

  const care = categoryResult([
    ...(pet.care?.needsMedication === true
      ? [{
          passes: adopter.care?.canAdministerMedication === true,
          success: "The adopter can administer medication.",
          risk: "This pet needs medication support that is not confirmed.",
          question: "Are you comfortable administering prescribed medication?",
        }]
      : []),
    ...(pet.care?.needsGrooming === true
      ? [{
          passes: adopter.care?.canProvideGrooming === true,
          success: "The adopter can meet grooming needs.",
          risk: "This pet's grooming needs are not confirmed.",
          question: "Can you maintain regular grooming?",
        }]
      : []),
  ]);

  const personality = categoryResult([
    ...(pet.personality?.goodWithChildren === false
      ? [{
          passes: adopter.personality?.hasChildren !== true,
          success: "The household has no children, matching this pet's needs.",
          risk: "This pet is not suitable for a household with children.",
          question: "Are children regularly present in the household?",
        }]
      : []),
    ...(pet.personality?.goodWithDogs === false
      ? [{
          passes: adopter.personality?.hasDogs !== true,
          success: "The household has no dogs, matching this pet's needs.",
          risk: "This pet is not suitable for a household with dogs.",
          question: "Are dogs regularly present in the household?",
        }]
      : []),
    ...(pet.personality?.energy !== undefined
      ? [{
          passes: adopter.personality?.preferredEnergy?.includes(pet.personality.energy) ?? false,
          success: "The adopter's preferred energy level aligns with this pet.",
          risk: "The adopter has not confirmed a suitable energy-level preference.",
          question: "Is this pet's energy level a good fit for your routine?",
        }]
      : []),
  ]);

  const categories = { mustHave, home, time, care, personality };
  const breakdown = Object.fromEntries(
    Object.entries(categories).map(([name, category]) => [name, category.score]),
  );
  const eligible = missingMustHaves.length === 0;
  const weightedScore = Object.entries(WEIGHTS).reduce(
    (total, [name, weight]) => total + categories[name as keyof typeof categories].score * (weight / 100),
    0,
  );

  return {
    score: eligible ? Math.round(weightedScore) : 0,
    eligible,
    reasons: Object.values(categories).flatMap((category) => category.reasons),
    risks: Object.values(categories).flatMap((category) => category.risks),
    questions: Object.values(categories).flatMap((category) => category.questions),
    breakdown,
  };
}
