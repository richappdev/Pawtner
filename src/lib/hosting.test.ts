import { describe, expect, it } from "vitest";

import { isBlockedStagingApiRequest } from "@/lib/hosting";

describe("isBlockedStagingApiRequest", () => {
  it("blocks API execution on the staging frontend service", () => {
    expect(isBlockedStagingApiRequest("staging", "/api/applications")).toBe(true);
  });

  it("allows pages on the staging frontend service", () => {
    expect(isBlockedStagingApiRequest("staging", "/applications")).toBe(false);
  });

  it("does not change production API behavior", () => {
    expect(isBlockedStagingApiRequest("production", "/api/applications")).toBe(
      false,
    );
  });
});
