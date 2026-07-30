import { cookies } from "next/headers";

import {
  FIREBASE_ID_TOKEN_COOKIE,
  FIREBASE_ID_TOKEN_COOKIE_NAMES,
  LEGACY_FIREBASE_ID_TOKEN_COOKIE,
} from "@/lib/auth/firebase-flags";

const MAX_AGE_SECONDS = 60 * 55; // refresh before typical 1h Firebase ID token expiry

async function readFirebaseIdTokenFromCookies(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    const raw = FIREBASE_ID_TOKEN_COOKIE_NAMES
      .map((name) => cookieStore.get(name)?.value)
      .find((value) => value !== undefined);
    if (!raw) return undefined;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  } catch {
    // Outside a Next.js request context (e.g. unit tests).
    return undefined;
  }
}

export async function readFirebaseIdTokenFromRequest(request?: Request): Promise<string | undefined> {
  if (request) {
    const header = request.headers.get("authorization");
    if (header?.toLowerCase().startsWith("bearer ")) {
      const token = header.slice(7).trim();
      if (token) return token;
    }

    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const parts = cookieHeader.split(";").map((part) => part.trim());
      for (const cookieName of FIREBASE_ID_TOKEN_COOKIE_NAMES) {
        for (const part of parts) {
          if (!part.startsWith(`${cookieName}=`)) continue;
          const raw = part.slice(cookieName.length + 1);
          try {
            return decodeURIComponent(raw);
          } catch {
            return raw;
          }
        }
      }
    }
  }

  // RSC / layouts call resolveAppUser() without a Request; read the cookie jar.
  return readFirebaseIdTokenFromCookies();
}

export function buildFirebaseIdTokenCookie(idToken: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${FIREBASE_ID_TOKEN_COOKIE}=${encodeURIComponent(idToken)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearFirebaseIdTokenCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${FIREBASE_ID_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function clearLegacyFirebaseIdTokenCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${LEGACY_FIREBASE_ID_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
