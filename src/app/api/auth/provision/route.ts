import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/http";
import { getFirebaseAdminAuth, verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { logger } from "@/lib/logging";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    logger.warn("auth.provision.failure", { reason: "missing_bearer" });
    return jsonError("Bearer Firebase ID token is required.", 401);
  }

  const idToken = header.slice(7).trim();
  if (!idToken) {
    logger.warn("auth.provision.failure", { reason: "empty_bearer" });
    return jsonError("Bearer Firebase ID token is required.", 401);
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const supabase = createServiceClient();
    const existing = await supabase
      .from("external_identities")
      .select("user_id")
      .eq("provider", "firebase")
      .eq("subject", decoded.uid)
      .maybeSingle();
    if (existing.error) return jsonError("Unable to verify pilot access.", 500);

    let data: string | null = existing.data?.user_id ?? null;
    let error: { message: string } | null = null;
    if (!data) {
      const parsed = z.object({ inviteToken: z.string().min(32).max(256) }).safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) return jsonError("A valid pilot invitation is required.", 403);
      const result = await supabase.rpc("provision_invited_firebase_identity", {
        p_firebase_uid: decoded.uid,
        p_email: decoded.email ?? null,
        p_display_name: decoded.name ?? decoded.email?.split("@")[0] ?? null,
        p_token_hash: createHash("sha256").update(parsed.data.inviteToken).digest("hex"),
      });
      data = result.data as string | null;
      error = result.error;
    }

    if (error) {
      logger.error("auth.provision.failure", {
        reason: "rpc_error",
        firebaseUid: decoded.uid,
        message: error.message,
      });
      return jsonError("Invitation is invalid, expired, or already used.", 403);
    }

    // Supabase third-party Firebase Auth requires role: authenticated on the JWT.
    const auth = getFirebaseAdminAuth();
    const userRecord = await auth.getUser(decoded.uid);
    const existingClaims = userRecord.customClaims ?? {};
    let claimsUpdated = false;
    if (existingClaims.role !== "authenticated") {
      await auth.setCustomUserClaims(decoded.uid, {
        ...existingClaims,
        role: "authenticated",
      });
      claimsUpdated = true;
    }

    logger.info("auth.provision.success", {
      firebaseUid: decoded.uid,
      userId: data,
      claimsUpdated,
    });

    return jsonOk({
      userId: data as string,
      firebaseUid: decoded.uid,
      claimsUpdated,
      refreshIdToken: claimsUpdated,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required environment variable:")) {
      logger.error("auth.provision.failure", { reason: "misconfigured", message: error.message });
      return jsonError("Service unavailable: identity provisioning is not configured.", 503);
    }
    logger.warn("auth.provision.failure", {
      reason: "token_verify",
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(
      error instanceof Error ? error.message : "Unable to verify Firebase token.",
      401,
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "auth/provision" });
}
