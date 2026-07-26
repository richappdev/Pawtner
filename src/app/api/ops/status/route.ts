import { NextResponse } from "next/server";

/**
 * Lightweight ops snapshot for Phase 4 monitoring / alerts wiring.
 * Does not expose secrets. Pair with Cloud Logging + Sentry alerts.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    metrics: {
      firebaseAuthEnabled:
        (process.env.FEATURE_FIREBASE_AUTH_ENABLED ??
          process.env.NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED) === "true",
      firebaseAuthCohortConfigured: Boolean(process.env.FIREBASE_AUTH_EMAIL_COHORT?.trim()),
      supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      sentryConfigured: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
    },
    alertsSuggested: [
      "Elevated 401/403 rate on /api/*",
      "provision_firebase_identity failures",
      "payment webhook failures",
      "database connection saturation",
      "unmapped Firebase UID denials (RLS)",
    ],
    timestamp: new Date().toISOString(),
  });
}
