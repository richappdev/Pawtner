import { describe, expect, it } from "vitest";

import {
  isBlockedDirectCloudRunRequest,
  isBlockedStagingApiRequest,
} from "@/lib/hosting";

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

  it("allows Firebase Hosting's rewrite to the internal service host", () => {
    expect(
      isBlockedDirectCloudRunRequest(
        "staging",
        "pawtner-hosting-web-staging-pvu47vzmnq-de.a.run.app",
        "pawtner-tw-staging.web.app",
      ),
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
