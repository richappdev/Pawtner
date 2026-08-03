import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/http";
import { getSessionActor } from "@/lib/auth/session-actor";
import { logger } from "@/lib/logging";
import { adoptionMutationError, requireAdoptionOperations } from "./adoption-common";

const mutationSchema = z.union([
  z.object({ action: z.literal("submit"), response: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0) }),
  z.object({ action: z.literal("review"), outcome: z.enum(["stable", "needs_support", "returned"]), note: z.string().trim().max(2_000).optional() }),
]);

export async function getFollowup(applicationId: string, followupId: string) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const { data, error } = await session.supabase.from("adoption_followups")
    .select("id,application_id,day_offset,due_at,submitted_at,reviewed_at,response,outcome,status,completed_at")
    .eq("id", followupId).eq("application_id", applicationId).maybeSingle();
  return error ? jsonError("Unable to load follow-up.", 500)
    : data ? jsonOk(data) : jsonError("Follow-up not found.", 404);
}

export async function patchFollowup(request: Request, applicationId: string, followupId: string) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid follow-up operation.", 422, parsed.error.flatten());
  const args = parsed.data.action === "submit"
    ? { functionName: "submit_adoption_followup", values: { p_application_id: applicationId, p_followup_id: followupId, p_response: parsed.data.response } }
    : { functionName: "review_adoption_followup", values: { p_application_id: applicationId, p_followup_id: followupId, p_outcome: parsed.data.outcome, p_note: parsed.data.note ?? null } };
  const { data, error } = await session.supabase.rpc(args.functionName, args.values);
  if (error) return adoptionMutationError(error);
  logger.info(`adoption.followup.${parsed.data.action === "submit" ? "submitted" : "reviewed"}`, {
    actorId: session.actor.id, applicationId, followupId,
  });
  return jsonOk(data);
}
