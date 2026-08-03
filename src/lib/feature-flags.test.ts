import { afterEach, describe, expect, it, vi } from "vitest";

import { getFlag } from "./feature-flags";

describe("getFlag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the documented *_ENABLED environment variable", () => {
    vi.stubEnv("FEATURE_AI_ENABLED", "false");

    expect(getFlag("ai")).toBe(false);
  });

  it("keeps the legacy environment variable as a fallback", () => {
    vi.stubEnv("FEATURE_COMMERCE", "off");

    expect(getFlag("commerce")).toBe(false);
  });

  it("prefers the documented environment variable over the legacy alias", () => {
    vi.stubEnv("FEATURE_AI_ENABLED", "false");
    vi.stubEnv("FEATURE_AI", "true");

    expect(getFlag("ai")).toBe(false);
  });

  it("keeps closed-pilot adoption operations default off", () => {
    expect(getFlag("closed_pilot_adoption_operations")).toBe(false);
    vi.stubEnv("FEATURE_CLOSED_PILOT_ADOPTION_OPERATIONS_ENABLED", "true");
    expect(getFlag("closed_pilot_adoption_operations")).toBe(true);
  });
});
