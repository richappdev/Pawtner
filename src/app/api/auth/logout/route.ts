import { NextResponse } from "next/server";

import { clearFirebaseIdTokenCookie } from "@/lib/auth/firebase-token";
import { isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (!isFirebaseAuthEnabled()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore missing env during local tooling.
    }
    return NextResponse.json({ ok: true, provider: "supabase" });
  }

  const response = NextResponse.json({ ok: true, provider: "firebase" });
  response.headers.append("Set-Cookie", clearFirebaseIdTokenCookie());
  return response;
}
