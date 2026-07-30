import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getFirebaseAuthRolloutMode,
  isFirebaseAuthCohortConfigured,
  isFirebaseAuthEnabled,
  isFirebaseAuthForcedForEmail,
} from "./firebase-flags";
import { readFirebaseIdTokenFromRequest } from "./firebase-token";

describe("firebase auth flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults firebase auth to disabled", () => {
    expect(isFirebaseAuthEnabled()).toBe(false);
    expect(getFirebaseAuthRolloutMode()).toBe("off");
  });

  it("reads FEATURE_FIREBASE_AUTH_ENABLED", () => {
    vi.stubEnv("FEATURE_FIREBASE_AUTH_ENABLED", "true");
    expect(isFirebaseAuthEnabled()).toBe(true);
    expect(getFirebaseAuthRolloutMode()).toBe("all");
  });

  it("respects email cohort for gradual cutover", () => {
    vi.stubEnv("FEATURE_FIREBASE_AUTH_ENABLED", "true");
    vi.stubEnv("FIREBASE_AUTH_EMAIL_COHORT", "alpha@example.com, beta@example.com");
    expect(isFirebaseAuthForcedForEmail("alpha@example.com")).toBe(true);
    expect(isFirebaseAuthForcedForEmail("other@example.com")).toBe(false);
    expect(isFirebaseAuthCohortConfigured()).toBe(true);
    expect(getFirebaseAuthRolloutMode()).toBe("cohort");
  });

  it("prefers NEXT_PUBLIC cohort for client-visible cutover", () => {
    vi.stubEnv("FEATURE_FIREBASE_AUTH_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMAIL_COHORT", "gamma@example.com");
    expect(isFirebaseAuthForcedForEmail("gamma@example.com")).toBe(true);
    expect(isFirebaseAuthForcedForEmail("alpha@example.com")).toBe(false);
  });

  it("accepts yes/on/1 as enabled", () => {
    vi.stubEnv("FEATURE_FIREBASE_AUTH_ENABLED", "yes");
    expect(isFirebaseAuthEnabled()).toBe(true);
  });
});

describe("readFirebaseIdTokenFromRequest", () => {
  it("reads bearer tokens", async () => {
    const request = new Request("https://example.com/api/me", {
      headers: { Authorization: "Bearer abc.def.ghi" },
    });
    expect(await readFirebaseIdTokenFromRequest(request)).toBe("abc.def.ghi");
  });

  it("reads the firebase id token cookie", async () => {
    const request = new Request("https://example.com/api/me", {
      headers: { cookie: "__session=token%2Bvalue; other=1" },
    });
    expect(await readFirebaseIdTokenFromRequest(request)).toBe("token+value");
  });

  it("temporarily reads the legacy firebase id token cookie", async () => {
    const request = new Request("https://example.com/api/me", {
      headers: { cookie: "pawtner_firebase_id_token=legacy%2Btoken; other=1" },
    });
    expect(await readFirebaseIdTokenFromRequest(request)).toBe("legacy+token");
  });

  it("prefers the Firebase Hosting session cookie over the legacy cookie", async () => {
    const request = new Request("https://example.com/api/me", {
      headers: {
        cookie: "pawtner_firebase_id_token=legacy; __session=current",
      },
    });
    expect(await readFirebaseIdTokenFromRequest(request)).toBe("current");
  });
});
