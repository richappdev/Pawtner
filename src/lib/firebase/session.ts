"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";

import { FIREBASE_ID_TOKEN_COOKIE } from "@/lib/auth/firebase-flags";
import { getFirebaseAuth } from "@/lib/firebase/client";

const MAX_AGE_SECONDS = 60 * 55;

export function writeFirebaseIdTokenCookie(idToken: string) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${FIREBASE_ID_TOKEN_COOKIE}=${encodeURIComponent(idToken)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearFirebaseIdTokenCookieClient() {
  document.cookie = `${FIREBASE_ID_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (user) {
    return user.getIdToken(forceRefresh);
  }

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (next: User | null) => {
      unsub();
      resolve(next ? await next.getIdToken(forceRefresh) : null);
    });
  });
}

export async function signOutFirebase() {
  clearFirebaseIdTokenCookieClient();
  await signOut(getFirebaseAuth());
}

/** Attach Bearer token for API calls when Firebase Auth is active. */
export async function fetchWithFirebaseAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getFirebaseIdToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
