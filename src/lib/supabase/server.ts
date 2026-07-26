import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { FIREBASE_ID_TOKEN_COOKIE, isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";

function requiredEnvironment(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY" | "SUPABASE_SERVICE_ROLE_KEY",
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function publicAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

export async function createClient() {
  const cookieStore = await cookies();
  const firebaseToken = isFirebaseAuthEnabled()
    ? cookieStore.get(FIREBASE_ID_TOKEN_COOKIE)?.value
    : undefined;

  if (firebaseToken) {
    const token = decodeURIComponent(firebaseToken);
    return createSupabaseClient(requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"), publicAnonKey(), {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      accessToken: async () => token,
    });
  }

  return createServerClient(requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"), publicAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot mutate response cookies. Middleware refreshes sessions.
        }
      },
    },
  });
}

export function createServiceClient() {
  return createSupabaseClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
