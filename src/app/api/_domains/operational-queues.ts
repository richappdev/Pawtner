import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/http";
import { createdAtCursorFilter, decodeCreatedAtCursor, encodeCreatedAtCursor } from "@/lib/api/cursor";
import { getSessionActor } from "@/lib/auth/session-actor";
import { logger } from "@/lib/logging";
import { applicationStatusSchema } from "@/lib/schemas/application";
import { REVIEWER_APPLICATION_SELECT, adoptionMutationError, requireAdoptionOperations } from "./adoption-common";

const staffRoles = ["support_agent", "moderator", "admin", "super_admin"];
const isStaff = (roles: readonly string[]) => roles.some((role) => staffRoles.includes(role));

function pageParams(request: Request) {
  const params = new URL(request.url).searchParams;
  return {
    params,
    limit: Math.min(Math.max(Number(params.get("limit") ?? 25) || 25, 1), 50),
    rawCursor: params.get("cursor"),
    cursor: decodeCreatedAtCursor(params.get("cursor")),
  };
}

export async function getFosterApplications(request: Request, applicationId?: string) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  const { data: foster, error: fosterError } = await session.supabase.from("foster_profiles")
    .select("id,status").eq("user_id", session.actor.id).maybeSingle();
  if (fosterError) return jsonError("Unable to verify foster access.", 500);
  if (!foster || foster.status !== "approved" || !session.actor.roles.includes("foster")) {
    return jsonError("An approved foster profile is required.", 403, { onboardingStatus: foster?.status ?? "missing" });
  }
  const { params, limit, rawCursor, cursor } = pageParams(request);
  if (rawCursor && !cursor) return jsonError("Invalid pagination cursor.", 422);
  const { data: pets, error: petError } = await session.supabase.from("pets").select("id,name")
    .eq("foster_profile_id", foster.id);
  if (petError) return jsonError("Unable to load foster pets.", 500);
  const petIds = (pets ?? []).map((pet) => pet.id);
  if (!petIds.length) return jsonOk(applicationId ? null : { items: [], nextCursor: null, pets: [] });
  let query = session.supabase.from("adoption_applications").select(REVIEWER_APPLICATION_SELECT)
    .in("pet_id", petIds).order("created_at", { ascending: false }).order("id", { ascending: false });
  if (applicationId) query = query.eq("id", applicationId).limit(1);
  else {
    query = query.limit(limit + 1);
    const rawStatus = params.get("status");
    const status = applicationStatusSchema.safeParse(rawStatus);
    if (rawStatus && !status.success) return jsonError("Invalid application status filter.", 422);
    if (status.success) query = query.eq("status", status.data);
    const rawPetId = params.get("petId");
    const petId = z.string().uuid().safeParse(rawPetId);
    if (rawPetId && !petId.success) return jsonError("Invalid petId filter.", 422);
    if (petId.success && petIds.includes(petId.data)) query = query.eq("pet_id", petId.data);
    if (cursor) query = query.or(createdAtCursorFilter(cursor));
  }
  const { data: rawData, error } = await query;
  if (error) return jsonError("Unable to load foster applications.", 500);
  const data = (rawData ?? []) as unknown as Array<Record<string, unknown> & { id: string; pet_id: string }>;
  if (applicationId) return data[0] ? jsonOk({ ...data[0], pet: pets?.find((pet) => pet.id === data[0].pet_id) }) : jsonError("Application not found.", 404);
  const rows = data;
  const visible = rows.slice(0, limit);
  const last = visible.at(-1) as (typeof visible)[number] & { created_at: string } | undefined;
  return jsonOk({
    items: visible.map((application) => ({ ...application, pet: pets?.find((pet) => pet.id === application.pet_id) })),
    nextCursor: rows.length > limit && last ? encodeCreatedAtCursor({ createdAt: last.created_at, id: last.id }) : null,
    pets,
  });
}

export async function getAdminApplications(request: Request, applicationId?: string) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  if (!isStaff(session.actor.roles)) return jsonError("Staff access is required.", 403);
  const { params, limit, rawCursor, cursor } = pageParams(request);
  if (rawCursor && !cursor) return jsonError("Invalid pagination cursor.", 422);
  let query = session.supabase.from("adoption_applications").select(REVIEWER_APPLICATION_SELECT)
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (applicationId) query = query.eq("id", applicationId).limit(1);
  else {
    query = query.limit(limit + 1);
    const rawStatus = params.get("status");
    const status = applicationStatusSchema.safeParse(rawStatus);
    if (rawStatus && !status.success) return jsonError("Invalid application status filter.", 422);
    if (status.success) query = query.eq("status", status.data);
    if (cursor) query = query.or(createdAtCursorFilter(cursor));
  }
  const { data: rawData, error } = await query;
  if (error) return jsonError("Unable to load admin applications.", 500);
  const rows = (rawData ?? []) as unknown as Array<Record<string, unknown> & { id: string }>;
  if (applicationId) return rows[0] ? jsonOk(rows[0]) : jsonError("Application not found.", 404);
  const visible = rows.slice(0, limit);
  const last = visible.at(-1) as (typeof visible)[number] & { created_at: string } | undefined;
  return jsonOk({ items: visible, nextCursor: rows.length > limit && last ? encodeCreatedAtCursor({ createdAt: last.created_at, id: last.id }) : null });
}

export async function getAdminFosters(request: Request, fosterId?: string) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  if (!isStaff(session.actor.roles)) return jsonError("Staff access is required.", 403);
  const { params, limit, rawCursor, cursor } = pageParams(request);
  if (rawCursor && !cursor) return jsonError("Invalid pagination cursor.", 422);
  let query = session.supabase.from("foster_profiles")
    .select("id,user_id,status,display_name,care_capacity,region,environment_notes,verification_notes,submitted_at,reviewed_at,created_at,updated_at")
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  if (fosterId) query = query.eq("id", fosterId).limit(1);
  else {
    query = query.limit(limit + 1);
    const rawStatus = params.get("status");
    const status = z.enum(["draft","submitted","under_review","need_info","approved","rejected","suspended"]).safeParse(rawStatus);
    if (rawStatus && !status.success) return jsonError("Invalid foster status filter.", 422);
    if (status.success) query = query.eq("status", status.data);
    if (cursor) query = query.or(createdAtCursorFilter(cursor));
  }
  const { data, error } = await query;
  if (error) return jsonError("Unable to load foster reviews.", 500);
  if (fosterId) return data?.[0] ? jsonOk(data[0]) : jsonError("Foster profile not found.", 404);
  const rows = data ?? [];
  const visible = rows.slice(0, limit);
  const last = visible.at(-1);
  return jsonOk({ items: visible, nextCursor: rows.length > limit && last ? encodeCreatedAtCursor({ createdAt: last.created_at, id: last.id }) : null });
}

export async function reviewFoster(request: Request, fosterId: string) {
  const unavailable = requireAdoptionOperations();
  if (unavailable) return unavailable;
  const session = await getSessionActor();
  if (!session) return jsonError("Authentication required.", 401);
  if (!isStaff(session.actor.roles)) return jsonError("Staff access is required.", 403);
  const parsed = z.object({
    status: z.enum(["under_review","need_info","approved","rejected","suspended"]),
    note: z.string().trim().min(1).max(5_000),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("A valid status and review note are required.", 422, parsed.error.flatten());
  const { data, error } = await session.supabase.rpc("review_foster_profile", {
    p_foster_profile_id: fosterId, p_status: parsed.data.status, p_note: parsed.data.note,
  });
  if (error) return adoptionMutationError(error);
  logger.info("adoption.foster.reviewed", { actorId: session.actor.id, fosterId, status: parsed.data.status });
  return jsonOk(data);
}
