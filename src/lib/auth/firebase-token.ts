import { FIREBASE_ID_TOKEN_COOKIE } from "@/lib/auth/firebase-flags";

const MAX_AGE_SECONDS = 60 * 55; // refresh before typical 1h Firebase ID token expiry

export function readFirebaseIdTokenFromRequest(request?: Request): string | undefined {
  if (!request) return undefined;

  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;

  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith(`${FIREBASE_ID_TOKEN_COOKIE}=`)) continue;
    const raw = part.slice(FIREBASE_ID_TOKEN_COOKIE.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return undefined;
}

export function buildFirebaseIdTokenCookie(idToken: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${FIREBASE_ID_TOKEN_COOKIE}=${encodeURIComponent(idToken)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearFirebaseIdTokenCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${FIREBASE_ID_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
