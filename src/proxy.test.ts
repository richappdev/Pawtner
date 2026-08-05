import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

describe("application proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function request(path: string) {
    vi.stubEnv("FEATURE_FIREBASE_AUTH_ENABLED", "true");
    return new NextRequest(`https://pawtner.example${path}`, {
      headers: {
        cookie: "__session=test-token",
      },
    });
  }

  it("keeps unprefixed page URLs unchanged", async () => {
    const response = await proxy(request("/explore?q=dog"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not add locale prefixes to API requests", async () => {
    const response = await proxy(request("/api/pets?q=dog"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});
