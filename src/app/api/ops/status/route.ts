import { NextResponse } from "next/server";

import {
  getFirebaseAuthCohortEmails,
  getFirebaseAuthRolloutMode,
  isFirebaseAuthCohortConfigured,
  isFirebaseAuthEnabled,
} from "@/lib/auth/firebase-flags";
import { logger } from "@/lib/logging";
import { deploymentMetadata } from "@/lib/environment";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Lightweight ops snapshot for Phase 4 monitoring / alerts wiring.
 * Does not expose secrets. Pair with Cloud Logging + Sentry alerts.
 */
export async function GET() {
  const deployment = deploymentMetadata();
  let firebaseIdentityCount: number | null = null;
  let supabaseIdentityCount: number | null = null;

  try {
    const service = createServiceClient();
    const [firebase, supabase] = await Promise.all([
      service
        .from("external_identities")
        .select("id", { count: "exact", head: true })
        .eq("provider", "firebase"),
      service
        .from("external_identities")
        .select("id", { count: "exact", head: true })
        .eq("provider", "supabase"),
    ]);
    firebaseIdentityCount = firebase.count ?? null;
    supabaseIdentityCount = supabase.count ?? null;
  } catch (error) {
    logger.warn("ops.status.identity_counts_unavailable", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }

  const cohortEmails = getFirebaseAuthCohortEmails();

  return NextResponse.json({
    ok: true,
    deployment,
    phase: "phase-4-cutover",
    metrics: {
      firebaseAuthEnabled: isFirebaseAuthEnabled(),
      firebaseAuthRollout: getFirebaseAuthRolloutMode(),
      firebaseAuthCohortConfigured: isFirebaseAuthCohortConfigured(),
      firebaseAuthCohortSize: cohortEmails.length,
      firebaseIdentityCount,
      supabaseIdentityCount,
      supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      sentryConfigured: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
      closedPilotAdoptionOperations:
        process.env.FEATURE_CLOSED_PILOT_ADOPTION_OPERATIONS_ENABLED === "true",
    },
    alertsSuggested: [
      "Elevated 401/403 rate on /api/*",
      "auth.provision.failure / auth.login.failure in Cloud Logging",
      "payment webhook failures",
      "database connection saturation",
      "unmapped Firebase UID denials (auth.resolve.unmapped)",
    ],
    rollback: {
      steps: [
        "Shrink FIREBASE_AUTH_EMAIL_COHORT (or clear to pause expansion)",
        "Or set FEATURE_FIREBASE_AUTH_ENABLED=false and NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED=false",
        "Redeploy App Hosting",
        "Keep external_identities table (additive; safe to retain)",
      ],
    },
    timestamp: new Date().toISOString(),
  });
}
