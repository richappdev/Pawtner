import { expect, test, type Page } from "@playwright/test";

const password = process.env.STAGING_FIXTURE_PASSWORD ?? "PawtnerLocal123!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/explore$/);
}

test.describe("closed-pilot critical role journeys", () => {
  test("invited adopter can see only their application journey", async ({ page }) => {
    await login(page, "pilot-adopter-a@pawtner.invalid");
    const response = await page.request.get("/api/applications");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "73000000-0000-4000-8000-000000000001" }),
    ]));
    await page.goto("/applications");
    await expect(page.locator("main")).toContainText(/申請|application/i);
  });

  test("approved foster can open their application review queue", async ({ page }) => {
    await login(page, "pilot-foster-a@pawtner.invalid");
    const response = await page.request.get("/api/foster/applications");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.data.items.length).toBeGreaterThan(0);
    await page.goto("/foster/applications");
    await expect(page.locator("main")).toContainText(/審核|申請|review|application/i);
  });

  test("administrator can inspect the cross-cohort application queue", async ({ page }) => {
    await login(page, "pilot-admin@pawtner.invalid");
    const response = await page.request.get("/api/admin/applications");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.data.items.length).toBeGreaterThanOrEqual(3);
    await page.goto("/admin/applications");
    await expect(page.locator("main")).toContainText(/審核|申請|review|application/i);
  });
});
