"use client";

import { createBrowserClient } from "@supabase/ssr";

import { isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";
import { getFirebaseIdToken } from "@/lib/firebase/session";

function requiredPublicEnvironment(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { url, key };
}

export function createClient() {
  const { url, key } = requiredPublicEnvironment();

  if (!isFirebaseAuthEnabled()) {
    return createBrowserClient(url, key);
  }

  return createBrowserClient(url, key, {
    accessToken: async () => await getFirebaseIdToken(false),
  });
}
