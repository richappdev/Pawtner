import { describe, expect, it } from "vitest";

import { jsonError } from "./http";

describe("API error contract", () => {
  it("adds a stable optional code without removing the compatibility message", async () => {
    const response = jsonError("Authentication is required.", 401, undefined, "auth.required");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: "auth.required",
        message: "Authentication is required.",
      },
    });
  });
});
