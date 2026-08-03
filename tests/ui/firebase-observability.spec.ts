import { expect, test } from "@playwright/test";

const telemetryHost = /(?:google-analytics\.com|googletagmanager\.com|firebaselogging\.googleapis\.com|firebaseinstallations\.googleapis\.com)/;

test("Firebase telemetry is silent before explicit consent", async ({ page }) => {
  const telemetryRequests: string[] = [];
  page.on("request", (request) => {
    if (telemetryHost.test(request.url())) telemetryRequests.push(request.url());
  });

  await page.goto("/");
  await page.waitForTimeout(1_000);

  expect(telemetryRequests).toEqual([]);
});

test("enabled observability starts only after analytics opt-in", async ({ page }) => {
  await page.goto("/");
  const allowButton = page.getByRole("button", { name: "允許分析資料" });
  test.skip(!(await allowButton.isVisible().catch(() => false)), "Observability rollback flag is disabled in this build.");

  const firstTelemetryRequest = page.waitForRequest(
    (request) => telemetryHost.test(request.url()),
    { timeout: 15_000 },
  );
  await allowButton.click();

  expect((await firstTelemetryRequest).url()).toMatch(telemetryHost);
});
