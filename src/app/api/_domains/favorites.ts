import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/http";
import { createdAtCursorFilter, decodeCreatedAtCursor, encodeCreatedAtCursor } from "@/lib/api/cursor";
import { getSessionActor } from "@/lib/auth/session-actor";
import { logger } from "@/lib/logging";
import { getPublicPet } from "@/lib/pets/public-data";
import { requireAdoptionOperations } from "./adoption-common";

const petSelection = z.object({ petId: z.string().uuid() });

export async function getFavorites(request: Request) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? 24) || 24, 1), 48);
  const rawCursor = new URL(request.url).searchParams.get("cursor");
  const cursor = decodeCreatedAtCursor(rawCursor);
  if (rawCursor && !cursor) return jsonError("Invalid pagination cursor.", 422);
  let query = session.supabase.from("favorites")
    .select("id,pet_id,created_at")
    .eq("user_id", session.actor.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) query = query.or(createdAtCursorFilter(cursor));
  const { data, error } = await query;
  if (error) return jsonError("Unable to load favorites.", 500);
  const rows = data ?? [];
  const visible = rows.slice(0, limit);
  const items = (await Promise.all(visible.map(async (favorite) => ({
    ...favorite,
    pet: await getPublicPet(favorite.pet_id),
  })))).filter((favorite) => favorite.pet !== null);
  const last = visible.at(-1);
  return jsonOk({ items, nextCursor: rows.length > limit && last ? encodeCreatedAtCursor({ createdAt: last.created_at, id: last.id }) : null });
}

export async function postFavorite(request: Request) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const parsed = petSelection.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("A valid petId is required.", 422);
  if (!await getPublicPet(parsed.data.petId)) return jsonError("Only a public pet can be favorited.", 409);
  const { data, error } = await session.supabase.from("favorites")
    .upsert({ user_id: session.actor.id, pet_id: parsed.data.petId }, { onConflict: "user_id,pet_id" })
    .select("id,pet_id,created_at").single();
  if (error) return jsonError("Unable to save favorite.", 500);
  logger.info("adoption.favorite.changed", { actorId: session.actor.id, petId: parsed.data.petId, action: "added" });
  return jsonOk(data, { status: 201 });
}

export async function deleteFavorite(request: Request) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const parsed = petSelection.safeParse({ petId: new URL(request.url).searchParams.get("petId") });
  if (!parsed.success) return jsonError("A valid petId query parameter is required.", 422);
  const { error } = await session.supabase.from("favorites").delete()
    .eq("user_id", session.actor.id).eq("pet_id", parsed.data.petId);
  if (error) return jsonError("Unable to remove favorite.", 500);
  logger.info("adoption.favorite.changed", { actorId: session.actor.id, petId: parsed.data.petId, action: "removed" });
  return jsonOk({ deleted: true });
}
