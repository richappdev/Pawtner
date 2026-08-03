import { expect, test } from "@playwright/test";

test.describe("closed-pilot adoption operations rollout", () => {
  test("default-off APIs hide unfinished operational writes", async ({ request }) => {
    const endpoints = [
      "/api/me/questionnaire", "/api/recommendations", "/api/favorites",
      "/api/applications", "/api/foster/applications", "/api/admin/applications", "/api/admin/fosters",
    ];
    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect([401, 403, 404]).toContain(response.status());
      expect(response.status()).not.toBe(500);
    }
  });

  test("adopter data pages require authentication", async ({ page }) => {
    for (const path of ["/me", "/favorites", "/recommend", "/applications"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("government discovery never exposes a Pawtner application action", async ({ request, page }) => {
    const response = await request.get("/api/pets?source=government&limit=1");
    if (!response.ok()) test.skip(true, "Government discovery is not enabled in this environment.");
    const payload = await response.json();
    const pet = payload.data?.items?.[0];
    if (!pet) test.skip(true, "No public government fixture is available.");
    expect(pet.adoptionAction.kind).toBe("shelter_contact");
    await page.goto(`/pets/${pet.id}`);
    await expect(page.getByRole("button", { name: "Apply through Pawtner" })).toHaveCount(0);
  });
});
