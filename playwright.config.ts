import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  workers: 4,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: "msedge",
    trace: "retain-on-failure",
  },
});
