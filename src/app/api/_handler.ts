import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { runAiPipeline } from "@/lib/ai/pipeline";
import { renderDeterministicDraft } from "@/lib/ai/templates";
import { writeAuditLog } from "@/lib/audit";
import { canAccessAdmin, canApproveAi, canManagePet, canReviewFoster } from "@/lib/auth/permissions";
import { verifyWebhookSignature } from "@/lib/commerce/webhook";
import { getActiveDonationDestination } from "@/lib/donations/active";
import { getFlag } from "@/lib/feature-flags";
import { scoreMatch, type AdopterMatchInput, type PetMatchInput } from "@/lib/matching/score";
import { getAdminPet, listAdminPets } from "@/lib/pets/admin-query";
import { getPublicPet, listPublicPets } from "@/lib/pets/public-data";
import { sanitizePetForPublic } from "@/lib/pets/public";
import { applicationStatusTransitionSchema } from "@/lib/schemas/application";
import { aiGenerateRequestSchema, aiReviewRequestSchema } from "@/lib/schemas/ai";
import {
  adminPetListQuerySchema,
  adminPetPatchSchema,
  adminPetReviewSchema,
  petCreateSchema,
  petUpdateSchema,
} from "@/lib/schemas/pet";
import { jsonError, jsonOk, parseJson, requireActor, requireUser, serviceClient } from "@/app/api/_shared";

const uuid = z.string().uuid();
const record = z.record(z.string(), z.unknown());
const pathname = (request: Request) => new URL(request.url).pathname;
const segmentId = (request: Request, segment: string) =>
  pathname(request).split(`/${segment}/`)[1]?.split("/")[0] ?? "";
const failed = (error: { message: string } | null) => (error ? jsonError(error.message, 500) : null);

type Db = SupabaseClient;

interface FavoriteRow {
  pets?: Record<string, unknown> | null;
  [key: string]: unknown;
}

async function publicDb() {
  return serviceClient();
}

export async function GET(request: Request) {
  const path = pathname(request);

  if (path === "/api/pets") {
    try {
      return jsonOk(await listPublicPets());
    } catch {
      return jsonError("Unable to load public pets.", 500);
    }
  }
  if (path.startsWith("/api/pets/")) {
    const id = segmentId(request, "pets");
    if (!uuid.safeParse(id).success) return jsonError("Invalid pet ID.", 422);
    try {
      const pet = await getPublicPet(id);
      return pet ? jsonOk(pet) : jsonError("Pet not found.", 404);
    } catch {
      return jsonError("Unable to load public pet.", 500);
    }
  }

  const service = await publicDb();
  if ("response" in service) return service.response;
  const db: Db = service.supabase;

  if (path.startsWith("/api/organizations/")) {
    const id = segmentId(request, "organizations");
    const { data, error } = await db
      .from("organizations")
      .select("id,name,slug,description,website_url,is_verified")
      .eq("id", id)
      .maybeSingle();
    return failed(error) ?? (data ? jsonOk(data) : jsonError("Organization not found.", 404));
  }
  if (path === "/api/products") {
    const { data, error } = await db
      .from("products")
      .select("id,sku,name,description,category,price_cents,currency,stock")
      .eq("is_active", true);
    return failed(error) ?? jsonOk(data ?? []);
  }
  if (path.startsWith("/api/donate/")) {
    const result = await getActiveDonationDestination(db, segmentId(request, "donate"));
    if (result.error) return jsonError(result.error.message, 500);
    return result.data
      ? jsonOk(result.data)
      : jsonError("No active donation authorization was found for this organization.", 404);
  }
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (path === "/api/me") {
    const { data, error } = await auth.supabase.from("user_profiles").select("*").eq("id", auth.user.id).single();
    return failed(error) ?? jsonOk(data);
  }
  if (path === "/api/favorites") {
    const { data, error } = await auth.supabase
      .from("favorites")
      .select("*, pets:pets_public(*)")
      .eq("user_id", auth.user.id);
    return (
      failed(error) ??
      jsonOk(
        ((data ?? []) as FavoriteRow[]).map((item) => ({
          ...item,
          pets: item.pets ? sanitizePetForPublic(item.pets) : item.pets,
        })),
      )
    );
  }
  if (path === "/api/applications" || path.startsWith("/api/applications/")) {
    const id = path === "/api/applications" ? undefined : segmentId(request, "applications");
    const query = auth.supabase.from("adoption_applications").select("*, application_status_history(*)");
    const { data, error } = id
      ? await query.eq("id", id).maybeSingle()
      : await query.eq("adopter_user_id", auth.user.id);
    return failed(error) ?? (id && !data ? jsonError("Application not found.", 404) : jsonOk(data));
  }
  if (path === "/api/questionnaires/active") {
    const { data, error } = await auth.supabase.from("questionnaires").select("*").eq("is_active", true);
    return failed(error) ?? jsonOk(data ?? []);
  }
  if (path === "/api/foster/pets" || path.startsWith("/api/foster/pets/")) {
    const { data: profile, error: profileError } = await auth.supabase
      .from("foster_profiles")
      .select("id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (profileError) return jsonError(profileError.message, 500);
    if (!profile) return jsonError("Foster profile not found.", 404);
    const query = auth.supabase.from("pets").select("*").eq("foster_profile_id", profile.id);
    const { data, error } =
      path === "/api/foster/pets"
        ? await query
        : await query.eq("id", segmentId(request, "pets")).maybeSingle();
    return failed(error) ?? jsonOk(data);
  }
  if (path === "/api/foster/wishlists") {
    const { data, error } = await auth.supabase.from("wishlists").select("*, wishlist_items(*)");
    return failed(error) ?? jsonOk(data ?? []);
  }
  const actor = await requireActor(request);
  if (!("actor" in actor)) return actor.response;
  if (path === "/api/admin/audit" && canAccessAdmin(actor.actor)) {
    const { data, error } = await actor.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return failed(error) ?? jsonOk(data ?? []);
  }
  if (path === "/api/admin/reports" && canAccessAdmin(actor.actor)) {
    const { data, error } = await actor.supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    return failed(error) ?? jsonOk(data ?? []);
  }
  if (path.startsWith("/api/admin/fosters/") && canReviewFoster(actor.actor, {})) {
    const { data, error } = await actor.supabase
      .from("foster_profiles")
      .select("*")
      .eq("id", segmentId(request, "fosters"))
      .maybeSingle();
    return failed(error) ?? (data ? jsonOk(data) : jsonError("Foster profile not found.", 404));
  }
  if (path === "/api/admin/flags" && canAccessAdmin(actor.actor)) {
    const { data, error } = await actor.supabase.from("feature_flags").select("*");
    return failed(error) ?? jsonOk(data ?? []);
  }
  if (path === "/api/admin/pets" || path.startsWith("/api/admin/pets/")) {
    if (!canAccessAdmin(actor.actor)) return jsonError("Administrator access is required.", 403);
    if (path === "/api/admin/pets") {
      const parsed = adminPetListQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams.entries()),
      );
      if (!parsed.success) return jsonError("Invalid query parameters.", 422, parsed.error.flatten());
      const { data, error } = await listAdminPets(actor.supabase, {
        status: parsed.data.status,
        species: parsed.data.species,
        isPublished: parsed.data.isPublished,
        q: parsed.data.q,
      });
      return failed(error) ?? jsonOk(data ?? []);
    }
    const id = segmentId(request, "pets");
    if (!uuid.safeParse(id).success) return jsonError("Invalid pet ID.", 422);
    const { data, error } = await getAdminPet(actor.supabase, id);
    return failed(error) ?? (data ? jsonOk(data) : jsonError("Pet not found.", 404));
  }
  return jsonError(
    path.startsWith("/api/admin") ? "Administrator access is required." : "Not found.",
    path.startsWith("/api/admin") ? 403 : 404,
  );
}

export async function POST(request: Request) {
  const path = pathname(request);
  if (path === "/api/payments/webhook") {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) return jsonError("Service unavailable: PAYMENT_WEBHOOK_SECRET is not configured.", 503);
    const payload = await request.text();
    const signature = request.headers.get("x-payment-signature") ?? "";
    if (!verifyWebhookSignature(payload, signature, secret)) return jsonError("Invalid webhook signature.", 401);
    let event: { id?: string; provider?: string };
    try {
      event = JSON.parse(payload) as { id?: string; provider?: string };
    } catch {
      return jsonError("Webhook body must be valid JSON.", 400);
    }
    if (!event.id || !event.provider) return jsonError("Webhook provider and event ID are required.", 422);
    const service = await serviceClient();
    if ("response" in service) return service.response;
    const { error } = await service.supabase.from("payment_webhook_events").insert({
      provider: event.provider,
      event_id: event.id,
      payload: event,
      processed_at: new Date().toISOString(),
    });
    if (error?.code === "23505") return jsonOk({ received: true, duplicate: true });
    return failed(error) ?? jsonOk({ received: true });
  }
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (path === "/api/favorites") {
    const body = await parseJson(request, z.object({ petId: uuid }));
    if ("response" in body) return body.response;
    const { data, error } = await auth.supabase
      .from("favorites")
      .upsert({ user_id: auth.user.id, pet_id: body.data.petId }, { onConflict: "user_id,pet_id" })
      .select()
      .single();
    return failed(error) ?? jsonOk(data, { status: 201 });
  }
  if (path === "/api/matching/score") {
    const body = await parseJson(
      request,
      z.object({
        pet: record,
        adopter: record,
      }),
    );
    if ("response" in body) return body.response;
    return jsonOk(
      scoreMatch(body.data.pet as unknown as PetMatchInput, body.data.adopter as unknown as AdopterMatchInput),
    );
  }
  if (path === "/api/foster/apply") {
    const body = await parseJson(
      request,
      z.object({
        displayName: z.string().trim().min(1).max(100),
        careCapacity: z.number().int().min(1).max(50).default(1),
        region: z.string().trim().max(80).optional(),
        environmentNotes: z.string().trim().max(5_000).optional(),
        submit: z.boolean().default(false),
      }),
    );
    if ("response" in body) return body.response;
    const status = body.data.submit ? "submitted" : "draft";
    const { data, error } = await auth.supabase
      .from("foster_profiles")
      .upsert(
        {
          user_id: auth.user.id,
          display_name: body.data.displayName,
          care_capacity: body.data.careCapacity,
          region: body.data.region,
          environment_notes: body.data.environmentNotes,
          status,
          submitted_at: body.data.submit ? new Date().toISOString() : null,
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    return failed(error) ?? jsonOk(data, { status: 201 });
  }
  if (path === "/api/foster/pets") {
    const body = await parseJson(request, petCreateSchema);
    if ("response" in body) return body.response;
    const { data: profile, error: profileError } = await auth.supabase
      .from("foster_profiles")
      .select("id,status")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (profileError) return jsonError(profileError.message, 500);
    if (!profile || profile.status !== "approved") {
      return jsonError("An approved foster profile is required to create pets.", 403);
    }
    const { data, error } = await auth.supabase
      .from("pets")
      .insert({
        foster_profile_id: profile.id,
        name: body.data.name,
        species: body.data.species,
        breed: body.data.breed,
        sex: body.data.sex,
        age_months: body.data.ageMonths,
        weight_kg: body.data.weightKg,
        color: body.data.color,
        region: body.data.region,
        status: body.data.status,
        sterilized: body.data.sterilized,
        microchipped: body.data.microchipped,
        vaccinated: body.data.vaccinated,
        dewormed: body.data.dewormed,
        personality_summary: body.data.personalitySummary,
        special_care: body.data.specialCare,
        adoption_conditions: body.data.adoptionConditions,
      })
      .select()
      .single();
    return failed(error) ?? jsonOk(data, { status: 201 });
  }
  if (path === "/api/foster/wishlists") {
    const body = await parseJson(
      request,
      z.object({
        title: z.string().trim().min(1).max(120),
        petId: uuid.optional(),
        isPublic: z.boolean().default(false),
        items: z
          .array(z.object({ productId: uuid, quantity: z.number().int().min(1).max(100).default(1) }))
          .default([]),
      }),
    );
    if ("response" in body) return body.response;
    const { data: profile, error: profileError } = await auth.supabase
      .from("foster_profiles")
      .select("id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (profileError) return jsonError(profileError.message, 500);
    if (!profile) return jsonError("Foster profile not found.", 404);
    const { data: wishlist, error } = await auth.supabase
      .from("wishlists")
      .insert({
        foster_profile_id: profile.id,
        pet_id: body.data.petId,
        title: body.data.title,
        is_public: body.data.isPublic,
      })
      .select()
      .single();
    if (error) return jsonError(error.message, 500);
    if (body.data.items.length > 0) {
      await auth.supabase.from("wishlist_items").insert(
        body.data.items.map((item) => ({
          wishlist_id: wishlist.id,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      );
    }
    return jsonOk(wishlist, { status: 201 });
  }
  if (path === "/api/applications") {
    const body = await parseJson(
      request,
      z.object({ petId: uuid, answers: record.optional(), questionnaireId: uuid.optional() }),
    );
    if ("response" in body) return body.response;
    const { data, error } = await auth.supabase
      .from("adoption_applications")
      .insert({ pet_id: body.data.petId, adopter_user_id: auth.user.id, status: "submitted" })
      .select()
      .single();
    if (error) return jsonError(error.message, 500);
    if (body.data.answers && body.data.questionnaireId) {
      await auth.supabase.from("application_answers").insert({
        application_id: data.id,
        questionnaire_id: body.data.questionnaireId,
        answers: body.data.answers,
      });
    }
    return jsonOk(data, { status: 201 });
  }
  if (path.startsWith("/api/foster/pets/") && path.endsWith("/submit")) {
    const id = segmentId(request, "pets");
    if (!uuid.safeParse(id).success) return jsonError("Invalid pet ID.", 422);
    const body = await parseJson(
      request,
      z.object({ note: z.string().trim().max(2_000).optional() }),
    );
    if ("response" in body) return body.response;
    const { data, error } = await auth.supabase.rpc("submit_pet_for_review", {
      p_pet_id: id,
      p_note: body.data.note ?? null,
    });
    return error
      ? jsonError("Pet is incomplete or cannot be submitted.", 409)
      : jsonOk(data);
  }
  if (path === "/api/cart/checkout") {
    if (!getFlag("commerce")) return jsonError("Commerce is currently disabled.", 403);
    const body = await parseJson(
      request,
      z.object({
        items: z.array(z.object({ productId: uuid, quantity: z.number().int().min(1).max(100) })).min(1),
      }),
    );
    if ("response" in body) return body.response;
    const service = await serviceClient();
    if ("response" in service) return service.response;
    const { data: order, error } = await service.supabase.rpc("create_checkout_order", {
      p_buyer_user_id: auth.user.id,
      p_items: body.data.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
    });
    if (error) return jsonError("Unable to create order. Check product availability and quantities.", 409);
    return jsonOk(order, { status: 201 });
  }
  if (path.includes("/orders/") && path.endsWith("/confirm-receipt")) {
    const id = segmentId(request, "orders");
    if (!uuid.safeParse(id).success) return jsonError("Invalid order ID.", 422);
    const { data: order, error: orderError } = await auth.supabase
      .from("orders")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();
    if (orderError) return jsonError(orderError.message, 500);
    if (!order) return jsonError("Order not found.", 404);
    if (order.status !== "shipped") return jsonError("Only shipped orders can be confirmed as received.", 409);

    const service = await serviceClient();
    if ("response" in service) return service.response;
    const { data, error } = await service.supabase
      .from("orders")
      .update({ status: "delivered", receipt_confirmed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "shipped")
      .select("id,status,receipt_confirmed_at")
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    return data ? jsonOk(data) : jsonError("Order status changed before receipt confirmation.", 409);
  }
  if (path.startsWith("/api/ai/")) {
    if (!getFlag("ai")) return jsonError("AI features are currently disabled.", 403);
    const body = await parseJson(request, aiGenerateRequestSchema);
    if ("response" in body) return body.response;
    const kind = path.includes("application-summary")
      ? "application_summary"
      : path.includes("pet-chat")
        ? "support_reply"
        : path.includes("pet-story")
          ? "pet_description"
          : "other";
    if (path.includes("image-enhance") && body.data.input.retainOriginal !== true) {
      return jsonError("Image enhancement requires retainOriginal: true.", 422);
    }
    if (path.includes("pet-chat") && !Array.isArray(body.data.input.approvedContext)) {
      return jsonOk({ status: "escalate", message: "An approved context is required." });
    }
    const result = await runAiPipeline({
      kind,
      input: body.data.input,
      generate: async () => renderDeterministicDraft(kind, body.data.input),
    });
    const { data, error } = await auth.supabase
      .from("ai_generations")
      .insert({
        kind: path.split("/").at(-1)?.replace(/-/g, "_"),
        requested_by: auth.user.id,
        input_snapshot: body.data.input,
        output_text: result.content,
        output_meta: { structuredFacts: result.structuredFacts },
        status: "needs_review",
        safety_flags: result.safety.flags,
        model_name: result.cost.model,
      })
      .select()
      .single();
    return failed(error) ?? jsonOk(data, { status: 201 });
  }
  if (path.startsWith("/api/admin/pets/") && path.endsWith("/review")) {
    const actor = await requireActor(request);
    if (!("actor" in actor)) return actor.response;
    if (!canManagePet(actor.actor, {})) return jsonError("Pet management permission is required.", 403);
    const id = segmentId(request, "pets");
    if (!uuid.safeParse(id).success) return jsonError("Invalid pet ID.", 422);
    const body = await parseJson(request, adminPetReviewSchema);
    if ("response" in body) return body.response;
    const { data, error } = await actor.supabase.rpc("review_pet", {
      p_pet_id: id,
      p_action: body.data.action,
      p_note: body.data.note ?? null,
    });
    if (error) return jsonError("Unable to complete pet review.", 409);
    return jsonOk(data);
  }
  return jsonError("Not found.", 404);
}

export async function PATCH(request: Request) {
  const path = pathname(request);
  const actor = await requireActor(request);
  if (!("actor" in actor)) return actor.response;
  if (path === "/api/me") {
    const body = await parseJson(
      request,
      z.object({
        display_name: z.string().min(1).max(100).optional(),
        phone: z.string().max(40).optional(),
        locale: z.string().max(20).optional(),
      }),
    );
    if ("response" in body) return body.response;
    const { data, error } = await actor.supabase
      .from("user_profiles")
      .update(body.data)
      .eq("id", actor.user.id)
      .select()
      .single();
    return failed(error) ?? jsonOk(data);
  }
  if (path.startsWith("/api/foster/pets/")) {
    const body = await parseJson(request, petUpdateSchema);
    if ("response" in body) return body.response;
    const id = segmentId(request, "pets");
    if (!uuid.safeParse(id).success) return jsonError("Invalid pet ID.", 422);
    const patch: Record<string, unknown> = {};
    if (body.data.name !== undefined) patch.name = body.data.name;
    if (body.data.species !== undefined) patch.species = body.data.species;
    if (body.data.breed !== undefined) patch.breed = body.data.breed;
    if (body.data.sex !== undefined) patch.sex = body.data.sex;
    if (body.data.ageMonths !== undefined) patch.age_months = body.data.ageMonths;
    if (body.data.weightKg !== undefined) patch.weight_kg = body.data.weightKg;
    if (body.data.color !== undefined) patch.color = body.data.color;
    if (body.data.region !== undefined) patch.region = body.data.region;
    if (body.data.status !== undefined) patch.status = body.data.status;
    if (body.data.sterilized !== undefined) patch.sterilized = body.data.sterilized;
    if (body.data.microchipped !== undefined) patch.microchipped = body.data.microchipped;
    if (body.data.vaccinated !== undefined) patch.vaccinated = body.data.vaccinated;
    if (body.data.dewormed !== undefined) patch.dewormed = body.data.dewormed;
    if (body.data.personalitySummary !== undefined) patch.personality_summary = body.data.personalitySummary;
    if (body.data.specialCare !== undefined) patch.special_care = body.data.specialCare;
    if (body.data.adoptionConditions !== undefined) patch.adoption_conditions = body.data.adoptionConditions;
    const { data, error } = await actor.supabase.from("pets").update(patch).eq("id", id).select().single();
    return failed(error) ?? jsonOk(data);
  }
  if (path.startsWith("/api/admin/pets/")) {
    if (!canManagePet(actor.actor, {})) return jsonError("Pet management permission is required.", 403);
    const id = segmentId(request, "pets");
    if (!uuid.safeParse(id).success) return jsonError("Invalid pet ID.", 422);
    const body = await parseJson(request, adminPetPatchSchema);
    if ("response" in body) return body.response;
    const existing = await actor.supabase
      .from("pets")
      .select("id,status,is_published,published_at")
      .eq("id", id)
      .maybeSingle();
    if (existing.error) return jsonError(existing.error.message, 500);
    if (!existing.data) return jsonError("Pet not found.", 404);
    const patch: Record<string, unknown> = {};
    if (body.data.status !== undefined) patch.status = body.data.status;
    if (body.data.isPublished !== undefined) {
      patch.is_published = body.data.isPublished;
      patch.published_at = body.data.isPublished ? new Date().toISOString() : null;
    }
    const { data, error } = await actor.supabase.from("pets").update(patch).eq("id", id).select().single();
    if (error) return jsonError(error.message, 500);
    try {
      await writeAuditLog(actor.supabase, {
        actorId: actor.actor.id,
        action: "pet.patch",
        resourceType: "pet",
        resourceId: id,
        metadata: { before: existing.data, after: data },
      });
    } catch (auditError) {
      return jsonError(
        auditError instanceof Error ? auditError.message : "Unable to write audit log.",
        500,
      );
    }
    return jsonOk(data);
  }
  if (path.startsWith("/api/admin/fosters/")) {
    const body = await parseJson(
      request,
      z.object({
        status: z.enum(["under_review", "need_info", "approved", "rejected", "suspended"]),
        verificationNotes: z.string().trim().max(5_000).optional(),
      }),
    );
    if ("response" in body) return body.response;
    if (!canReviewFoster(actor.actor, {})) return jsonError("Foster review permission is required.", 403);
    const { data, error } = await actor.supabase
      .from("foster_profiles")
      .update({
        status: body.data.status,
        verification_notes: body.data.verificationNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", segmentId(request, "fosters"))
      .select()
      .single();
    return failed(error) ?? jsonOk(data);
  }
  if (path === "/api/admin/reports") {
    const body = await parseJson(
      request,
      z.object({
        id: uuid,
        status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
      }),
    );
    if ("response" in body) return body.response;
    if (!canAccessAdmin(actor.actor)) return jsonError("Administrator access is required.", 403);
    const { data, error } = await actor.supabase
      .from("reports")
      .update({
        status: body.data.status,
        resolved_at: ["resolved", "dismissed"].includes(body.data.status)
          ? new Date().toISOString()
          : null,
      })
      .eq("id", body.data.id)
      .select()
      .single();
    return failed(error) ?? jsonOk(data);
  }
  if (path.startsWith("/api/applications/")) {
    const body = await parseJson(request, applicationStatusTransitionSchema);
    if ("response" in body) return body.response;
    const id = segmentId(request, "applications");
    const { data, error } = await actor.supabase.rpc("transition_application", {
      p_application_id: id,
      p_status: body.data.status,
      p_note: body.data.note ?? null,
    });
    return error ? jsonError("Invalid or unauthorized application transition.", 409) : jsonOk(data);
  }
  if (path.includes("/ai/") && path.endsWith("/approve")) {
    const body = await parseJson(request, aiReviewRequestSchema);
    if ("response" in body) return body.response;
    if (!canApproveAi(actor.actor)) return jsonError("AI review permission is required.", 403);
    const { data, error } = await actor.supabase
      .from("ai_generations")
      .update({
        status: body.data.approved ? "approved" : "rejected",
        reviewed_by: actor.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", body.data.contentId)
      .select()
      .single();
    return failed(error) ?? jsonOk(data);
  }
  return jsonError("Not found.", 404);
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const petId = new URL(request.url).searchParams.get("petId");
  if (!petId || !uuid.safeParse(petId).success) {
    return jsonError("A valid petId query parameter is required.", 422);
  }
  const { error } = await auth.supabase
    .from("favorites")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("pet_id", petId);
  return failed(error) ?? jsonOk({ deleted: true });
}
