import { NextResponse } from "next/server";

import {
  clearFirebaseIdTokenCookie,
  clearLegacyFirebaseIdTokenCookie,
} from "@/lib/auth/firebase-token";
import { isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";
import { logger } from "@/lib/logging";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const providers: string[] = [];

  if (isFirebaseAuthEnabled()) {
    providers.push("firebase");
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    providers.push("supabase");
  } catch {
    // Ignore missing env / already-signed-out during local tooling.
  }

  logger.info("auth.logout.success", { providers });

  const response = NextResponse.json({ ok: true, providers });
  // Always clear Firebase cookie during dual-auth so leftover tokens cannot stick.
  response.headers.append("Set-Cookie", clearFirebaseIdTokenCookie());
  response.headers.append("Set-Cookie", clearLegacyFirebaseIdTokenCookie());
  return response;
}
