import { NextResponse } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/http";
import { getFirebaseAdminAuth, verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return jsonError("Bearer Firebase ID token is required.", 401);
  }

  const idToken = header.slice(7).trim();
  if (!idToken) {
    return jsonError("Bearer Firebase ID token is required.", 401);
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("provision_firebase_identity", {
      p_firebase_uid: decoded.uid,
      p_email: decoded.email ?? null,
      p_display_name: decoded.name ?? decoded.email?.split("@")[0] ?? null,
    });

    if (error) {
      return jsonError(error.message, 500);
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

    return jsonOk({
      userId: data as string,
      firebaseUid: decoded.uid,
      claimsUpdated,
      refreshIdToken: claimsUpdated,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required environment variable:")) {
      return jsonError("Service unavailable: identity provisioning is not configured.", 503);
    }
    return jsonError(
      error instanceof Error ? error.message : "Unable to verify Firebase token.",
      401,
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "auth/provision" });
}
