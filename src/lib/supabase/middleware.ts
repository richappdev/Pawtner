import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { FIREBASE_ID_TOKEN_COOKIE, isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";

function requiredPublicEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      ? (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      : process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Phase 1 hosting-only / dual-auth: when Firebase Auth is enabled, skip Supabase cookie refresh.
  // Identity is carried by the Firebase ID token cookie + Authorization header on API calls.
  if (isFirebaseAuthEnabled() && request.cookies.get(FIREBASE_ID_TOKEN_COOKIE)?.value) {
    return response;
  }

  const supabase = createServerClient(
    requiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.getClaims();
  return response;
}
