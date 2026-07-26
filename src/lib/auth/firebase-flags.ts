export const FIREBASE_ID_TOKEN_COOKIE = "pawtner_firebase_id_token";

export function isFirebaseAuthEnabled(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED ?? process.env.FEATURE_FIREBASE_AUTH_ENABLED;
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

/** Gradual cutover cohort: comma-separated emails that must use Firebase Auth. */
export function isFirebaseAuthForcedForEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const cohort = process.env.FIREBASE_AUTH_EMAIL_COHORT ?? "";
  if (!cohort.trim()) return isFirebaseAuthEnabled();
  const allowed = cohort.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
