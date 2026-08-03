import { afterEach, describe, expect, it } from "vitest";

import { getFirebaseWebConfig } from "@/lib/firebase/client";
import {
  isFirebaseObservabilityEnabled,
  sanitizeEventParameters,
  sanitizeRoutePath,
} from "@/lib/firebase/observability";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Firebase observability", () => {
  it("is disabled unless the public rollback flag is exactly true", () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_OBSERVABILITY_ENABLED;
    expect(isFirebaseObservabilityEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_FIREBASE_OBSERVABILITY_ENABLED = "false";
    expect(isFirebaseObservabilityEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_FIREBASE_OBSERVABILITY_ENABLED = "true";
    expect(isFirebaseObservabilityEnabled()).toBe(true);
  });

  it("adds the optional measurement ID to the existing Firebase config", () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "public-key";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "app-id";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "pawtner-local.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "pawtner-local";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "000000000000";
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "G-TEST123";
    expect(getFirebaseWebConfig().measurementId).toBe("G-TEST123");
  });

  it("removes queries and normalizes public dynamic routes", () => {
    expect(sanitizeRoutePath("/pets/123e4567-e89b-12d3-a456-426614174000?q=private#top"))
      .toBe("/pets/[id]");
    expect(sanitizeRoutePath("/donate/my-rescue?campaign=spring")).toBe("/donate/[orgSlug]");
    expect(sanitizeRoutePath("/explore?q=someone@example.com")).toBe("/explore");
  });

  it("retains only allowlisted, bounded event parameters", () => {
    const unsafe = {
      species: "dog",
      source_type: "private_foster",
      status: "available",
      region_present: true,
      email: "person@example.com",
      pet_name: "Secret name",
      arbitrary: { private: true },
    };
    const safe = sanitizeEventParameters("view_item", unsafe);
    expect(safe).toEqual({
      species: "dog",
      source_type: "private_foster",
      status: "available",
      region_present: true,
    });
    expect(JSON.stringify(safe)).not.toContain("person@example.com");
    expect(JSON.stringify(safe)).not.toContain("Secret name");
  });
});
