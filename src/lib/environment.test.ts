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

  it("accepts the approved production configuration", () => {
    expect(validateEnvironment({
      ...shared,
      PAWTNER_ENV: "production",
      NEXT_PUBLIC_PAWTNER_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://rlwctljjjvlxrexcgqmg.supabase.co",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pawtner-app-2026",
    }).environment).toBe("production");
  });

  it("rejects production resources in staging", () => {
    expect(() => validateEnvironment({
      ...shared,
      PAWTNER_ENV: "staging",
      NEXT_PUBLIC_PAWTNER_ENV: "staging",
      NEXT_PUBLIC_SUPABASE_URL: "https://rlwctljjjvlxrexcgqmg.supabase.co",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pawtner-app-2026",
      PAWTNER_STAGING_SUPABASE_PROJECT_REF: "stagingref",
    })).toThrow(/production Firebase/);
  });

  it("rejects mismatched staging branch identifiers", () => {
    expect(() => validateEnvironment({
      ...shared,
      PAWTNER_ENV: "staging",
      NEXT_PUBLIC_PAWTNER_ENV: "staging",
      NEXT_PUBLIC_SUPABASE_URL: "https://actualbranch.supabase.co",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pawtner-staging-2026",
      PAWTNER_STAGING_SUPABASE_PROJECT_REF: "expectedbranch",
    })).toThrow(/does not match/);
  });
});
