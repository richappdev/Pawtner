import { questionnaireV2AnswersSchema, toAdopterMatchInput } from "@/lib/adoption/questionnaire";
import { toPetMatchInput, type PetRequirementRow, type PetTraitMatchRow } from "@/lib/adoption/requirements";
import { jsonError, jsonOk } from "@/lib/api/http";
import { getSessionActor } from "@/lib/auth/session-actor";
import { scoreMatch } from "@/lib/matching/score";
import { searchPublicPets } from "@/lib/pets/public-data";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdoptionOperations } from "./adoption-common";

export async function getRecommendations(request: Request) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 12) || 12, 1), 24);
  const { data: questionnaire } = await session.supabase
    .from("questionnaires").select("id,version").eq("is_active", true)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  const { data: saved } = questionnaire ? await session.supabase
    .from("adopter_questionnaire_responses")
    .select("answers,questionnaire_version")
    .eq("user_id", session.actor.id)
    .eq("questionnaire_version", questionnaire.version)
    .maybeSingle() : { data: null };
  const parsedAnswers = questionnaireV2AnswersSchema.safeParse(saved?.answers);
  const adopter = parsedAnswers.success ? toAdopterMatchInput(parsedAnswers.data) : null;
  const page = await searchPublicPets({ cursor: params.get("cursor") ?? undefined, limit });
  const ids = page.items.map((pet) => pet.id);
  const db = createServiceClient();
  const [{ data: requirementRows }, { data: traitRows }] = ids.length ? await Promise.all([
    db.from("pet_match_requirements").select("pet_id,allows_apartment,requires_fenced_yard,minimum_home_size_sqm,minimum_daily_care_hours,requires_medication_ability,requires_grooming_ability,allows_children,allows_dogs,energy_level,hard_requirements").in("pet_id", ids),
    db.from("pet_traits").select("pet_id,energy_level,child_friendly,sociability_dogs").in("pet_id", ids),
  ]) : [{ data: [] }, { data: [] }];
  const requirements = new Map((requirementRows ?? []).map((row) => [row.pet_id, row as PetRequirementRow & { pet_id: string }]));
  const traits = new Map((traitRows ?? []).map((row) => [row.pet_id, row as PetTraitMatchRow & { pet_id: string }]));
  const items = page.items.map((pet) => {
    const missingData: string[] = [];
    if (!adopter) missingData.push("questionnaire");
    if (!requirements.has(pet.id)) missingData.push("pet_requirements");
    if (!traits.has(pet.id)) missingData.push("pet_traits");
    const result = adopter
      ? scoreMatch(toPetMatchInput(requirements.get(pet.id) ?? null, traits.get(pet.id) ?? null), adopter)
      : null;
    return {
      pet,
      score: result?.score ?? null,
      eligible: result?.eligible ?? false,
      evaluatedCriteria: result?.evaluatedCriteria ?? 0,
      breakdown: result?.breakdown ?? {},
      reasons: result?.reasons.slice(0, 3) ?? [],
      risks: result?.risks.slice(0, 3) ?? [],
      followUpQuestions: result?.questions.slice(0, 3) ?? ["Complete your questionnaire to evaluate this match."],
      missingData,
      action: pet.adoptionAction,
    };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return jsonOk({ items, nextCursor: page.nextCursor, questionnaireComplete: Boolean(adopter) });
}
