import { z } from "zod";

import { getSessionActor } from "@/lib/auth/session-actor";
import { jsonError, jsonOk } from "@/lib/api/http";

export async function GET(request: Request) {
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";
  let query = session.supabase
    .from("notifications")
    .select("id,kind,title,body,href,resource_type,resource_id,read_at,created_at")
    .eq("user_id", session.actor.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (unreadOnly) query = query.is("read_at", null);
  const { data, error } = await query;
  return error ? jsonError("Unable to load notifications.", 500) : jsonOk(data ?? []);
}

export async function PATCH(request: Request) {
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid notification selection.", 422);
  const { data, error } = await session.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.actor.id)
    .in("id", parsed.data.ids)
    .select("id,read_at");
  return error ? jsonError("Unable to update notifications.", 500) : jsonOk(data ?? []);
}
