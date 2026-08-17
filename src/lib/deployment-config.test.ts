import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const cloudRunWorkflows = [
  ".github/workflows/production.yml",
  ".github/workflows/staging.yml",
];

describe("Cloud Run deployment secrets", () => {
  it.each(cloudRunWorkflows)("mounts the MOA sync secret in %s", (workflow) => {
    const contents = readFileSync(resolve(process.cwd(), workflow), "utf8");

    expect(contents).toContain("MOA_SYNC_SECRET=MOA_SYNC_SECRET:latest");
  });

  it("runs an authenticated production operational smoke on a schedule", () => {
    const contents = readFileSync(
      resolve(process.cwd(), ".github/workflows/production-smoke.yml"),
      "utf8",
    );

    expect(contents).toContain("schedule:");
    expect(contents).toContain("PAWTNER_SMOKE_MOA_HEALTH: \"true\"");
    expect(contents).toContain("PAWTNER_SMOKE_MOA_DRY_RUN: \"true\"");
    expect(contents).toContain("secrets.PAWTNER_SMOKE_ADMIN_PASSWORD");
  });

  it("pins the Firebase emulator CLI used by the isolated pilot harness", () => {
    const contents = readFileSync(resolve(process.cwd(), "scripts/dev-local.mjs"), "utf8");

    expect(contents).toContain('firebase-tools@15.27.0');
    expect(contents).not.toContain("firebase-tools@latest");
  });

  it("uses the Firebase Hosting session cookie in the authenticated smoke", () => {
    const contents = readFileSync(
      resolve(process.cwd(), "scripts/live-admin-pets-smoke.mjs"),
      "utf8",
    );

    expect(contents).toContain('const COOKIE = "__session"');
    expect(contents).not.toContain('const COOKIE = "pawtner_firebase_id_token"');
  });
});
