import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

describe("locale proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function request(path: string, acceptLanguage = "en-US,en;q=0.9") {
    vi.stubEnv("FEATURE_FIREBASE_AUTH_ENABLED", "true");
    return new NextRequest(`https://pawtner.example${path}`, {
      headers: {
        "accept-language": acceptLanguage,
        cookie: "__session=test-token",
      },
    });
  }

  it("redirects legacy page URLs to a detected locale and preserves the query", async () => {
    const response = await proxy(request("/explore?q=dog"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://pawtner.example/en/explore?q=dog");
  });

  it("uses the locale cookie before the browser language", async () => {
    const localizedRequest = request("/admin/pets", "en-US,en;q=0.9");
    localizedRequest.cookies.set("NEXT_LOCALE", "zh-TW");
    const response = await proxy(localizedRequest);

    expect(response.headers.get("location")).toBe("https://pawtner.example/zh-TW/admin/pets");
  });

  it("does not add locale prefixes to API requests", async () => {
    const response = await proxy(request("/api/pets?q=dog"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});
