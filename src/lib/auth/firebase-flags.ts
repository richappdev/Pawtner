export const FIREBASE_ID_TOKEN_COOKIE = "pawtner_firebase_id_token";

function parseBool(raw: string | undefined): boolean {
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

function firebaseAuthEmailCohort(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMAIL_COHORT ?? process.env.FIREBASE_AUTH_EMAIL_COHORT ?? ""
  );
}

/** Gradual cutover cohort: comma-separated emails that must use Firebase Auth. */
export function isFirebaseAuthForcedForEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const cohort = firebaseAuthEmailCohort();
  if (!cohort.trim()) return isFirebaseAuthEnabled();
  const allowed = cohort
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
