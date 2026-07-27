import { z } from "zod";

import { getSessionActor } from "@/lib/auth/session-actor";
import { jsonError, jsonOk } from "@/lib/api/http";

const schema = z.object({
  name: z.enum([
    "pet_viewed",
    "pet_favorited",
    "questionnaire_completed",
    "application_submitted",
    "ai_content_approved",
    "order_created",
    "followup_completed",
  ]),
  resourceType: z.string().trim().max(80).optional(),
  resourceId: z.string().trim().max(200).optional(),
  properties: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid analytics event.", 422);
  const { error } = await session.supabase.from("analytics_events").insert({
    user_id: session.actor.id,
    name: parsed.data.name,
    resource_type: parsed.data.resourceType,
    resource_id: parsed.data.resourceId,
    properties: parsed.data.properties,
  });
  return error ? jsonError("Unable to record event.", 500) : jsonOk({ accepted: true }, { status: 202 });
}
