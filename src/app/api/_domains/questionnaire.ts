import { getSessionActor } from "@/lib/auth/session-actor";
import { jsonError, jsonOk } from "@/lib/api/http";
import { logger } from "@/lib/logging";
import { questionnaireCompleteness, questionnaireV2AnswersSchema } from "@/lib/adoption/questionnaire";
import { requireAdoptionOperations } from "./adoption-common";

export async function getQuestionnaire() {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const { data: questionnaire, error } = await session.supabase
    .from("questionnaires")
    .select("id,name,version,schema,is_active")
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return jsonError("Unable to load questionnaire.", 500);
  if (!questionnaire) return jsonError("No active questionnaire is configured.", 503);
  const { data: response, error: responseError } = await session.supabase
    .from("adopter_questionnaire_responses")
    .select("id,questionnaire_id,questionnaire_version,answers,completed_at,updated_at")
    .eq("user_id", session.actor.id)
    .eq("questionnaire_version", questionnaire.version)
    .maybeSingle();
  if (responseError) return jsonError("Unable to load questionnaire response.", 500);
  return jsonOk({ questionnaire, response, completeness: questionnaireCompleteness(response?.answers) });
}

export async function getActiveQuestionnaire() {
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const { data, error } = await session.supabase.from("questionnaires")
    .select("id,name,version,schema,is_active").eq("is_active", true)
    .order("version", { ascending: false });
  return error ? jsonError("Unable to load questionnaires.", 500) : jsonOk(data ?? []);
}

export async function putQuestionnaire(request: Request) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const raw = await request.json().catch(() => null);
  const parsed = questionnaireV2AnswersSchema.safeParse(raw?.answers ?? raw);
  if (!parsed.success) return jsonError("Questionnaire answers are incomplete or invalid.", 422, parsed.error.flatten());
  const { data: questionnaire } = await session.supabase
    .from("questionnaires").select("id,version").eq("is_active", true)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (!questionnaire) return jsonError("No active questionnaire is configured.", 503);
  const now = new Date().toISOString();
  const { data, error } = await session.supabase
    .from("adopter_questionnaire_responses")
    .upsert({
      user_id: session.actor.id,
      questionnaire_id: questionnaire.id,
      questionnaire_version: questionnaire.version,
      answers: parsed.data,
      completed_at: now,
      updated_at: now,
    }, { onConflict: "user_id,questionnaire_version" })
    .select("id,questionnaire_id,questionnaire_version,answers,completed_at,updated_at")
    .single();
  if (error) return jsonError("Unable to save questionnaire.", 500);
  logger.info("adoption.questionnaire.completed", { actorId: session.actor.id, questionnaireVersion: questionnaire.version });
  return jsonOk({ response: data, completeness: 100 });
}
