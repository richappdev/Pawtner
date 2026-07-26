"use client";

import { createBrowserClient } from "@supabase/ssr";

import { FIREBASE_ID_TOKEN_COOKIE, isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";
import { getFirebaseAuth } from "@/lib/firebase/client";
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

function hasFirebaseSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (getFirebaseAuth().currentUser) return true;
  } catch {
    // Firebase web config may be missing in some local setups.
  }
  return document.cookie.split(";").some((part) => part.trim().startsWith(`${FIREBASE_ID_TOKEN_COOKIE}=`));
}

/** Browser client for app data. May bind Firebase JWT via accessToken. */
export function createClient() {
  const { url, key } = requiredPublicEnvironment();

  // Dual-auth: only attach Firebase JWT when a Firebase session exists.
  // Non-cohort users keep Supabase Auth cookie sessions (do not pass accessToken).
  if (isFirebaseAuthEnabled() && hasFirebaseSessionHint()) {
    return createBrowserClient(url, key, {
      accessToken: async () => (await getFirebaseIdToken(false)) ?? null,
    });
  }

  return createBrowserClient(url, key);
}

/**
 * Plain cookie-session client for email/password Auth only.
 * Never pass accessToken — supabase-js rejects signInWithPassword when it is set.
 */
export function createPasswordAuthClient() {
  const { url, key } = requiredPublicEnvironment();
  return createBrowserClient(url, key);
}
