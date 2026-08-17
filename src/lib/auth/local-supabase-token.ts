import { createHmac } from "node:crypto";

import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createLocalSupabaseAccessToken(
  firebaseUid: string,
  secret: string,
  issuedAt = Math.floor(Date.now() / 1_000),
): string {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    aud: "authenticated",
    exp: issuedAt + 5 * 60,
    iat: issuedAt,
    iss: "supabase",
    role: "authenticated",
    sub: firebaseUid,
  });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function isLoopbackHost(value: string | undefined): boolean {
  if (!value) return false;
  const hostname = value.includes("://") ? new URL(value).hostname : value.split(":")[0];
  return hostname === "127.0.0.1" || hostname === "localhost";
}

/**
 * Firebase Auth Emulator ID tokens are unsigned, while Supabase third-party
 * auth requires asymmetrically signed tokens. After Firebase Admin verifies
 * the emulator token, exchange it for a short-lived local Supabase token so
 * CI still exercises the real RLS policies. Production tokens pass through.
 */
export async function toSupabaseAccessToken(firebaseToken: string): Promise<string> {
  if (process.env.PAWTNER_ENV !== "local") return firebaseToken;
  if (
    !isLoopbackHost(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
    !isLoopbackHost(process.env.NEXT_PUBLIC_SUPABASE_URL)
  ) {
    throw new Error("Local Firebase token exchange requires loopback emulators.");
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("Missing required environment variable: SUPABASE_JWT_SECRET");
  const decoded = await verifyFirebaseIdToken(firebaseToken);
  return createLocalSupabaseAccessToken(decoded.uid, secret);
}
