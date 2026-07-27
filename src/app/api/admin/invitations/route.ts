import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSessionActor } from "@/lib/auth/session-actor";
import { jsonError, jsonOk } from "@/lib/api/http";
import { createServiceClient } from "@/lib/supabase/server";

const invitationSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  intendedRole: z.enum(["adopter", "foster"]).default("adopter"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

async function requireAdmin() {
  const session = await getSessionActor();
  if (!session) return null;
  return canAccessAdmin(session.actor) ? session : null;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return jsonError("Administrator access is required.", 403);
  const { data, error } = await session.supabase
    .from("pilot_invitations")
    .select("id,email,intended_role,expires_at,accepted_at,revoked_at,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return error ? jsonError("Unable to load invitations.", 500) : jsonOk(data ?? []);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return jsonError("Administrator access is required.", 403);
  const parsed = invitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid invitation.", 422, parsed.error.flatten());

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString();
  const service = createServiceClient();
  const { data, error } = await service
    .from("pilot_invitations")
    .insert({
      email: parsed.data.email,
      token_hash: tokenHash,
      intended_role: parsed.data.intendedRole,
      invited_by: session.actor.id,
      expires_at: expiresAt,
    })
    .select("id,email,intended_role,expires_at,created_at")
    .single();
  if (error) return jsonError("Unable to create invitation.", 409);

  const origin = new URL(request.url).origin;
  return jsonOk({ ...data, inviteUrl: `${origin}/signup?invite=${encodeURIComponent(token)}` }, { status: 201 });
}
