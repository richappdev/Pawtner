import { describe, expect, it } from "vitest";

import { isBlockedDirectCloudRunRequest } from "@/lib/hosting";

describe("isBlockedDirectCloudRunRequest", () => {
  it("blocks the direct staging Cloud Run hostname", () => {
    expect(
      isBlockedDirectCloudRunRequest(
        "staging",
        "pawtner-hosting-web-staging-611592714843.asia-east1.run.app",
      ),
    ).toBe(true);
  });

  it("blocks a direct hostname with an explicit port", () => {
    expect(
      isBlockedDirectCloudRunRequest(
        "staging",
        "pawtner-hosting-web-staging-pvu47vzmnq-de.a.run.app:443",
      ),
    ).toBe(true);
  });

  it("allows the staging Firebase Hosting hostname", () => {
    expect(
      isBlockedDirectCloudRunRequest("staging", "pawtner-tw-staging.web.app"),
    ).toBe(false);
  });

  it("does not change production direct-host behavior", () => {
    expect(
      isBlockedDirectCloudRunRequest(
        "production",
        "pawtner-hosting-web-611592714843.asia-east1.run.app",
      ),
    ).toBe(false);
  });
});
