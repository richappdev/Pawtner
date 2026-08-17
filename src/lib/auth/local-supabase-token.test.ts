import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createLocalSupabaseAccessToken } from "./local-supabase-token";

describe("local Supabase access token", () => {
  it("mints a five-minute authenticated token for the mapped app user", () => {
    const appUserId = "10000000-0000-4000-8000-000000000001";
    const token = createLocalSupabaseAccessToken(appUserId, "local-secret", 1_700_000_000);
    const [header, payload, signature] = token.split(".");

    expect(JSON.parse(Buffer.from(header, "base64url").toString("utf8"))).toEqual({
      alg: "HS256",
      typ: "JWT",
    });
    expect(JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))).toEqual({
      aud: "authenticated",
      exp: 1_700_000_300,
      iat: 1_700_000_000,
      iss: "supabase",
      role: "authenticated",
      sub: appUserId,
    });
    expect(signature).toBe(
      createHmac("sha256", "local-secret").update(`${header}.${payload}`).digest("base64url"),
    );
  });
});
