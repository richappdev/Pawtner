import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";

export type AppUser = {
  id: string;
  email?: string | null;
  authProvider: "supabase" | "firebase";
  firebaseUid?: string;
};

function bearerToken(request?: Request): string | undefined {
  const header = request?.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return undefined;
  return header.slice(7).trim() || undefined;
}

async function resolveInternalUserId(subject: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("external_identities")
    .select("user_id")
    .eq("subject", subject)
    .maybeSingle();
  return data?.user_id ?? null;
}

/**
 * Resolve the authenticated Pawtner user.
 * - Dual-auth: Firebase Bearer / cookie token → Admin verify → external_identities map
 * - Default: Supabase cookie session (profile id == auth uid)
 */
export async function resolveAppUser(request?: Request): Promise<AppUser | null> {
  if (isFirebaseAuthEnabled()) {
    const token = bearerToken(request);
    if (token) {
      try {
        const decoded = await verifyFirebaseIdToken(token);
        const mapped = await resolveInternalUserId(decoded.uid);
        if (!mapped) return null;
        return {
          id: mapped,
          email: decoded.email ?? null,
          authProvider: "firebase",
          firebaseUid: decoded.uid,
        };
      } catch {
        // Fall through to Supabase session for dual-auth window.
      }
    }
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const mapped = await resolveInternalUserId(user.id);
    return {
      id: mapped ?? user.id,
      email: user.email,
      authProvider: mapped && mapped !== user.id ? "firebase" : "supabase",
      firebaseUid: mapped && mapped !== user.id ? user.id : undefined,
    };
  } catch {
    return null;
  }
}

export function createUserScopedSupabase(accessToken?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL or anon key");
  }

  if (!accessToken) {
    return createSupabaseJsClient(url, key);
  }

  return createSupabaseJsClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    accessToken: async () => accessToken,
  });
}
