"use client";

import { createBrowserClient } from "@supabase/ssr";
import { onAuthStateChanged } from "firebase/auth";

import { isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";
import { getFirebaseAuth } from "@/lib/firebase/client";

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

async function firebaseAccessToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (user) {
    return user.getIdToken();
  }

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (next) => {
      unsub();
      resolve(next ? await next.getIdToken() : null);
    });
  });
}

export function createClient() {
  const { url, key } = requiredPublicEnvironment();

  if (!isFirebaseAuthEnabled()) {
    return createBrowserClient(url, key);
  }

  return createBrowserClient(url, key, {
    accessToken: async () => await firebaseAccessToken(),
  });
}
