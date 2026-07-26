import { NextResponse } from "next/server";

import { isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";
import { readFirebaseIdTokenFromRequest } from "@/lib/auth/firebase-token";
import { createUserScopedSupabase, resolveAppUser } from "@/lib/auth/resolve-user";
import { logger } from "@/lib/logging";
import { createClient } from "@/lib/supabase/server";

export function jsonOk<T>(data: T, init: ResponseInit = {}) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: { message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export async function requireUser(request?: Request) {
  try {
    if (isFirebaseAuthEnabled()) {
      const appUser = await resolveAppUser(request);
      if (appUser?.authProvider === "firebase") {
        const token = readFirebaseIdTokenFromRequest(request);
        const supabase = token ? createUserScopedSupabase(token) : await createClient();
        return {
          supabase,
          user: {
            id: appUser.id,
            email: appUser.email ?? undefined,
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: "",
          },
          appUser,
        } as const;
      }
      // Dual-auth: fall through to Supabase cookie session when no Firebase token.
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      logger.warn("auth.require_user.unauthorized", {
        firebaseEnabled: isFirebaseAuthEnabled(),
      });
      return { response: jsonError("Authentication is required.", 401) } as const;
    }

    return {
      supabase,
      user,
      appUser: { id: user.id, email: user.email, authProvider: "supabase" as const },
    } as const;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required environment variable:")) {
      return { response: jsonError("Service unavailable: Supabase environment is not configured.", 503) } as const;
    }
    return { response: jsonError("Unable to initialize authentication.", 503) } as const;
  }
}
