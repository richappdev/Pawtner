export const SHARED_FIREBASE_PROJECT_ID = "pawtner-app-2026";
export const SHARED_SUPABASE_PROJECT_REF = "rlwctljjjvlxrexcgqmg";

export type PawtnerEnvironment = "local" | "staging" | "production";

export type EnvironmentInput = Record<string, string | undefined>;

function required(input: EnvironmentInput, name: string): string {
  const value = input[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseEnvironment(value: string): PawtnerEnvironment {
  if (value === "local" || value === "staging" || value === "production") return value;
  throw new Error("PAWTNER_ENV must be one of: local, staging, production");
}

function supabaseProjectRef(url: string): string | null {
  const hostname = new URL(url).hostname;
  const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
  return match?.[1] ?? null;
}

export function validateEnvironment(input: EnvironmentInput = process.env) {
  const environment = parseEnvironment(required(input, "PAWTNER_ENV"));
  const publicEnvironment = parseEnvironment(required(input, "NEXT_PUBLIC_PAWTNER_ENV"));
  if (environment !== publicEnvironment) {
    throw new Error("PAWTNER_ENV and NEXT_PUBLIC_PAWTNER_ENV must match");
  }

  const supabaseUrl = required(input, "NEXT_PUBLIC_SUPABASE_URL");
  const firebaseProjectId = required(input, "NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  required(input, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  required(input, "NEXT_PUBLIC_FIREBASE_API_KEY");
  required(input, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  required(input, "NEXT_PUBLIC_FIREBASE_APP_ID");
  required(input, "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");

  const url = new URL(supabaseUrl);
  const projectRef = supabaseProjectRef(supabaseUrl);

  if (environment === "local") {
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      throw new Error("Local Pawtner must use the local Supabase endpoint");
    }
    if (firebaseProjectId !== "pawtner-local") {
      throw new Error("Local Pawtner must use Firebase project pawtner-local");
    }
    required(input, "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST");
  }

  if (environment === "staging" || environment === "production") {
    if (firebaseProjectId !== SHARED_FIREBASE_PROJECT_ID) {
      throw new Error(`${environment} frontend must use the approved shared Firebase backend`);
    }
    if (projectRef !== SHARED_SUPABASE_PROJECT_REF) {
      throw new Error(`${environment} frontend must use the approved shared Supabase backend`);
    }
  }

  return {
    environment,
    backendEnvironment: environment === "local" ? "local" : "production",
    firebaseProjectId,
    supabaseUrl,
    supabaseProjectRef: projectRef,
  };
}

export function deploymentMetadata(input: EnvironmentInput = process.env) {
  const validated = validateEnvironment(input);
  return {
    environment: validated.environment,
    backendEnvironment: validated.backendEnvironment,
    commitSha: input.PAWTNER_COMMIT_SHA?.trim() || "unknown",
    imageDigest: input.PAWTNER_IMAGE_DIGEST?.trim() || "unknown",
  };
}
