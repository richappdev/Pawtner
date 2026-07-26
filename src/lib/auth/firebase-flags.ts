export const FIREBASE_ID_TOKEN_COOKIE = "pawtner_firebase_id_token";

export function parseBool(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  switch (raw.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    default:
      return false;
  }
}

export function isFirebaseAuthEnabled(): boolean {
  return parseBool(
    process.env.NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED ?? process.env.FEATURE_FIREBASE_AUTH_ENABLED,
  );
}

function firebaseAuthEmailCohortRaw(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMAIL_COHORT ?? process.env.FIREBASE_AUTH_EMAIL_COHORT ?? ""
  );
}

/** Parsed gradual-cutover allowlist (empty = all emails when Firebase Auth is enabled). */
export function getFirebaseAuthCohortEmails(): string[] {
  return firebaseAuthEmailCohortRaw()
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isFirebaseAuthCohortConfigured(): boolean {
  return getFirebaseAuthCohortEmails().length > 0;
}

/** Gradual cutover cohort: comma-separated emails that must use Firebase Auth. */
export function isFirebaseAuthForcedForEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getFirebaseAuthCohortEmails();
  if (allowed.length === 0) return isFirebaseAuthEnabled();
  return allowed.includes(email.trim().toLowerCase());
}

/** Phase 4 rollout mode for ops snapshots. */
export function getFirebaseAuthRolloutMode(): "off" | "cohort" | "all" {
  if (!isFirebaseAuthEnabled()) return "off";
  return isFirebaseAuthCohortConfigured() ? "cohort" : "all";
}
