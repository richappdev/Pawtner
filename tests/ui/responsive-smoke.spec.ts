import { expect, test } from "@playwright/test";

import messages from "../../messages/zh-TW.json";

const viewports = [
  { name: "mobile", width: 360, height: 800 },
  { name: "tablet", width: 768, height: 900 },
  { name: "laptop", width: 1024, height: 900 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

const publicRoutes = [
  { path: "/", heading: messages.Public.heroTitle },
  { path: "/explore", heading: messages.Public.exploreTitle },
  { path: "/login", heading: messages.Auth.welcomeTitle },
  { path: "/products", heading: messages.Public.productsTitle },
  { path: "/legal/privacy", heading: messages.Legal.privacy },
] as const;

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of publicRoutes) {
      test(`${route.path} has a stable responsive shell`, async ({ page }) => {
        await page.goto(route.path);
        await expect(page.getByRole("heading", { name: route.heading, exact: false }).first()).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", "zh-TW");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      });
    }

    test("controls expose keyboard focus and usable touch targets", async ({ page }) => {
      await page.goto("/explore");
      const searchInput = page.locator('input[name="q"]');
      await expect(searchInput).toBeVisible();
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
      const targets = await page.locator("button:visible, input:visible, select:visible").evaluateAll((elements) =>
        elements.slice(0, 12).map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      );
      for (const target of targets) {
        expect(target.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
}

test("landing search stays on the unprefixed route", async ({ page }) => {
  await page.goto("/");
  const form = page.locator('form[action="/explore"]');
  await form.locator('input[name="q"]').fill("Taipei");
  await form.locator("button").click();
  await expect(page).toHaveURL(/\/explore\?q=Taipei$/);
});

test("legacy locale prefixes permanently redirect and preserve queries", async ({ request }) => {
  for (const locale of ["zh-TW", "en"]) {
    const response = await request.get(`/${locale}/explore?q=dog`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/explore?q=dog");
  }
});

test("pet detail uses the first real public result when available", async ({ page }) => {
  await page.goto("/explore");
  const petLinks = page.locator('a[href^="/pets/"]');
  if ((await petLinks.count()) === 0) test.skip(true, "No approved public pets in this environment.");
  await petLinks.first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(messages.SharedPet.verified)).toBeVisible();
  await expect(page.getByText(messages.SharedPet.verifying)).toBeVisible();
});

test("protected admin routes keep unauthenticated users out", async ({ page }) => {
  await page.goto("/admin/pets");
  await expect(page).toHaveURL(/\/login/);
});
