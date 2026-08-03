import { applicationStatusTransitionSchema, applicationSubmitSchema } from "@/lib/schemas/application";
import { questionnaireV2AnswersSchema, toAdopterMatchInput } from "@/lib/adoption/questionnaire";
import { toPetMatchInput, type PetRequirementRow, type PetTraitMatchRow } from "@/lib/adoption/requirements";
import { jsonError, jsonOk } from "@/lib/api/http";
import { createdAtCursorFilter, decodeCreatedAtCursor, encodeCreatedAtCursor } from "@/lib/api/cursor";
import { getSessionActor } from "@/lib/auth/session-actor";
import { logger } from "@/lib/logging";
import { scoreMatch } from "@/lib/matching/score";
import { ADOPTER_APPLICATION_SELECT, adoptionMutationError, requireAdoptionOperations, REVIEWER_APPLICATION_SELECT } from "./adoption-common";

const isReviewerRole = (roles: readonly string[]) => roles.some((role) =>
  ["foster", "support_agent", "moderator", "admin", "super_admin"].includes(role),
);

async function petSummary(session: NonNullable<Awaited<ReturnType<typeof getSessionActor>>>, petId: string) {
  const { data } = await session.supabase.from("pets")
    .select("id,name,species,breed,region,status,source_type,is_published,review_status")
    .eq("id", petId).maybeSingle();
  return data;
}

export async function getAdopterApplications(request: Request) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 20) || 20, 1), 50);
  let query = session.supabase.from("adoption_applications")
    .select(ADOPTER_APPLICATION_SELECT)
    .eq("adopter_user_id", session.actor.id)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
  const rawCursor = params.get("cursor");
  const cursor = decodeCreatedAtCursor(rawCursor);
  if (rawCursor && !cursor) return jsonError("Invalid pagination cursor.", 422);
  if (cursor) query = query.or(createdAtCursorFilter(cursor));
  const { data, error } = await query;
  if (error) return jsonError("Unable to load applications.", 500);
  const rows = (data ?? []) as unknown as Array<Record<string, unknown> & { id: string; pet_id: string }>;
  const visible = rows.slice(0, limit);
  const items = await Promise.all(visible.map(async (application) => ({
    ...application,
    pet: await petSummary(session, application.pet_id),
  })));
  const last = visible.at(-1) as (typeof visible)[number] & { created_at: string } | undefined;
  return jsonOk({ items, nextCursor: rows.length > limit && last ? encodeCreatedAtCursor({ createdAt: last.created_at, id: last.id }) : null });
}

export async function postApplication(request: Request) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const parsed = applicationSubmitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("A valid petId is required.", 422, parsed.error.flatten());
  const [{ data: requirement }, { data: traits }, { data: questionnaire }] = await Promise.all([
    session.supabase.from("pet_match_requirements").select("allows_apartment,requires_fenced_yard,minimum_home_size_sqm,minimum_daily_care_hours,requires_medication_ability,requires_grooming_ability,allows_children,allows_dogs,energy_level,hard_requirements").eq("pet_id", parsed.data.petId).maybeSingle(),
    session.supabase.from("pet_traits").select("energy_level,child_friendly,sociability_dogs").eq("pet_id", parsed.data.petId).maybeSingle(),
    session.supabase.from("questionnaires").select("id,version").eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!questionnaire) return jsonError("No active questionnaire is configured.", 409);
  const { data: response } = await session.supabase.from("adopter_questionnaire_responses")
    .select("answers").eq("user_id", session.actor.id)
    .eq("questionnaire_version", questionnaire.version).maybeSingle();
  const answers = questionnaireV2AnswersSchema.safeParse(response?.answers);
  if (!answers.success) return jsonError("Complete the active questionnaire before applying.", 409);
  const match = scoreMatch(
    toPetMatchInput(requirement as PetRequirementRow | null, traits as PetTraitMatchRow | null),
    toAdopterMatchInput(answers.data),
  );
  const snapshot = {
    score: match.score,
    eligible: match.eligible,
    evaluatedCriteria: match.evaluatedCriteria,
    breakdown: match.breakdown,
    reasons: match.reasons.slice(0, 3),
    risks: match.risks.slice(0, 3),
    questions: match.questions.slice(0, 3),
  };
  const { data, error } = await session.supabase.rpc("submit_adoption_application", {
    p_pet_id: parsed.data.petId,
    p_match_result: snapshot,
  });
  if (error) {
    logger.warn("adoption.application.submit_failed", { actorId: session.actor.id, petId: parsed.data.petId, code: error.code });
    return adoptionMutationError(error);
  }
  logger.info("adoption.application.submitted", { actorId: session.actor.id, petId: parsed.data.petId, applicationId: data.id });
  return jsonOk(data, { status: 201 });
}

export async function getApplication(_request: Request, id: string) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const { data: identity, error: identityError } = await session.supabase.from("adoption_applications")
    .select("id,adopter_user_id,pet_id").eq("id", id).maybeSingle();
  if (identityError) return jsonError("Unable to load application.", 500);
  if (!identity) return jsonError("Application not found.", 404);
  const select = identity.adopter_user_id === session.actor.id ? ADOPTER_APPLICATION_SELECT
    : isReviewerRole(session.actor.roles) ? REVIEWER_APPLICATION_SELECT : ADOPTER_APPLICATION_SELECT;
  const { data: rawData, error } = await session.supabase.from("adoption_applications")
    .select(select).eq("id", id).maybeSingle();
  if (error) return jsonError("Unable to load application.", 500);
  if (!rawData) return jsonError("Application not found.", 404);
  const data = rawData as unknown as Record<string, unknown>;
  return jsonOk({ ...data, pet: await petSummary(session, identity.pet_id), viewer: identity.adopter_user_id === session.actor.id ? "adopter" : "reviewer" });
}

export async function patchApplication(request: Request, id: string) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const parsed = applicationStatusTransitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid application transition.", 422, parsed.error.flatten());
  const { data, error } = await session.supabase.rpc("transition_application", {
    p_application_id: id,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
  });
  if (error) {
    logger.warn("adoption.application.transition_failed", { actorId: session.actor.id, applicationId: id, to: parsed.data.status, code: error.code });
    return adoptionMutationError(error);
  }
  logger.info("adoption.application.transitioned", { actorId: session.actor.id, applicationId: id, to: parsed.data.status });
  return jsonOk(data);
}
