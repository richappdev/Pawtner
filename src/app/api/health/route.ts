import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "pawtner",
    timestamp: new Date().toISOString(),
    hosting: process.env.K_SERVICE ? "cloud-run" : process.env.FIREBASE_CONFIG ? "firebase" : "unknown",
    firebaseAuthEnabled:
      (process.env.FEATURE_FIREBASE_AUTH_ENABLED ?? process.env.NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED) ===
      "true",
  });
}
