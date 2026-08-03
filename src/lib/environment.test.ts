import { describe, expect, it } from "vitest";

import { validateEnvironment } from "@/lib/environment";

const shared = {
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
  NEXT_PUBLIC_FIREBASE_API_KEY: "firebase-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "sender-id",
};

describe("validateEnvironment", () => {
  it("accepts isolated local configuration", () => {
    expect(validateEnvironment({
      ...shared,
      PAWTNER_ENV: "local",
      NEXT_PUBLIC_PAWTNER_ENV: "local",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pawtner-local",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    }).environment).toBe("local");
  });

  it.each(["staging", "production"] as const)(
    "accepts the %s frontend with the shared production backend",
    (environment) => {
      expect(validateEnvironment({
        ...shared,
        PAWTNER_ENV: environment,
        NEXT_PUBLIC_PAWTNER_ENV: environment,
        NEXT_PUBLIC_SUPABASE_URL: "https://rlwctljjjvlxrexcgqmg.supabase.co",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pawtner-app-2026",
      })).toMatchObject({ environment, backendEnvironment: "production" });
    },
  );

  it("rejects an unapproved Firebase backend for staging", () => {
    expect(() => validateEnvironment({
      ...shared,
      PAWTNER_ENV: "staging",
      NEXT_PUBLIC_PAWTNER_ENV: "staging",
      NEXT_PUBLIC_SUPABASE_URL: "https://rlwctljjjvlxrexcgqmg.supabase.co",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pawtner-staging-2026",
    })).toThrow(/shared Firebase backend/);
  });

  it("rejects an unapproved Supabase backend for staging", () => {
    expect(() => validateEnvironment({
      ...shared,
      PAWTNER_ENV: "staging",
      NEXT_PUBLIC_PAWTNER_ENV: "staging",
      NEXT_PUBLIC_SUPABASE_URL: "https://actualbranch.supabase.co",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pawtner-app-2026",
    })).toThrow(/shared Supabase backend/);
  });
});
