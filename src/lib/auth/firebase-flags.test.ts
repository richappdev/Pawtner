import { afterEach, describe, expect, it, vi } from "vitest";

import { isFirebaseAuthEnabled, isFirebaseAuthForcedForEmail } from "./firebase-flags";

describe("firebase auth flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults firebase auth to disabled", () => {
    expect(isFirebaseAuthEnabled()).toBe(false);
  });

  it("reads FEATURE_FIREBASE_AUTH_ENABLED", () => {
    vi.stubEnv("FEATURE_FIREBASE_AUTH_ENABLED", "true");
    expect(isFirebaseAuthEnabled()).toBe(true);
  });

  it("respects email cohort for gradual cutover", () => {
    vi.stubEnv("FIREBASE_AUTH_EMAIL_COHORT", "alpha@example.com, beta@example.com");
    expect(isFirebaseAuthForcedForEmail("alpha@example.com")).toBe(true);
    expect(isFirebaseAuthForcedForEmail("other@example.com")).toBe(false);
  });
});
