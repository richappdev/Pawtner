import { NextResponse } from "next/server";

import { getFirebaseAuthRolloutMode, isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "pawtner",
    timestamp: new Date().toISOString(),
    hosting: process.env.K_SERVICE ? "cloud-run" : process.env.FIREBASE_CONFIG ? "firebase" : "unknown",
    firebaseAuthEnabled: isFirebaseAuthEnabled(),
    firebaseAuthRollout: getFirebaseAuthRolloutMode(),
  });
}
