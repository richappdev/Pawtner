import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 360, height: 800 },
  { name: "tablet", width: 768, height: 900 },
  { name: "laptop", width: 1024, height: 900 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

const publicRoutes = [
  { path: "/", heading: "讓每次相遇" },
  { path: "/explore", heading: "遇見正在等家的牠" },
  { path: "/login", heading: "歡迎回來" },
  { path: "/products", heading: "照護物資" },
  { path: "/legal/privacy", heading: "隱私權政策" },
] as const;

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of publicRoutes) {
      test(`${route.path} has a stable responsive shell`, async ({ page }) => {
        await page.goto(route.path);
        await expect(page.getByRole("heading", { name: route.heading, exact: false }).first()).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      });
    }

    test("controls expose keyboard focus and usable touch targets", async ({ page }) => {
      await page.goto("/explore");
      const firstControl = page.locator("a, button, input, select").first();
      await firstControl.focus();
      await expect(firstControl).toBeFocused();
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

test("pet detail uses the first real public result when available", async ({ page }) => {
  await page.goto("/explore");
  const petLinks = page.locator('a[href^="/pets/"]');
  if ((await petLinks.count()) === 0) test.skip(true, "No approved public pets in this environment.");
  await petLinks.first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("生活與照護紀錄")).toBeVisible();
  await expect(page.getByText("接下來會發生什麼")).toBeVisible();
});

test("protected admin routes keep unauthenticated users out", async ({ page }) => {
  await page.goto("/admin/pets");
  await expect(page).toHaveURL(/\/login/);
});
