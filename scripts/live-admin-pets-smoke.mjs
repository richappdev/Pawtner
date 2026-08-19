import { assessMoaDryRun, assessMoaSyncHistory } from "./moa-sync-health.mjs";

const BASE = process.env.PAWTNER_SMOKE_BASE_URL ??
  "https://pawtner-web--pawtner-app-2026.asia-east1.hosted.app";
const API_KEY = process.env.PAWTNER_SMOKE_FIREBASE_API_KEY;
const EMAIL = process.env.PAWTNER_SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.PAWTNER_SMOKE_ADMIN_PASSWORD;
const CHECK_MOA_DRY_RUN = process.env.PAWTNER_SMOKE_MOA_DRY_RUN === "true";
const CHECK_MOA_HEALTH = process.env.PAWTNER_SMOKE_MOA_HEALTH === "true";
const MOA_DRY_RUN_ONLY = process.env.PAWTNER_SMOKE_MOA_DRY_RUN_ONLY === "true";
const COOKIE = "__session";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`PASS: ${msg}`);
}

async function main() {
  assert(API_KEY && EMAIL && PASSWORD, "Smoke credentials are provided through environment secrets");
  console.log("=== Live smoke: admin pets ===\n");

  // 1) Firebase sign-in
  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
    },
  );
  const signIn = await signInRes.json();
  assert(signInRes.ok && signIn.idToken, `Firebase login (${signInRes.status})`);
  const idToken = signIn.idToken;
  const cookieHeader = `${COOKIE}=${encodeURIComponent(idToken)}`;

  // 2) Provision identity
  const provisionRes = await fetch(`${BASE}/api/auth/provision`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const provisionBody = await provisionRes.json().catch(() => ({}));
  assert(provisionRes.ok, `Provision identity (${provisionRes.status}) ${JSON.stringify(provisionBody)}`);

  // 3) Admin pets API
  const petsRes = await fetch(`${BASE}/api/admin/pets`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
      Cookie: cookieHeader,
    },
  });
  const petsBody = await petsRes.json().catch(() => ({}));
  assert(petsRes.ok, `GET /api/admin/pets (${petsRes.status}) ${JSON.stringify(petsBody).slice(0, 300)}`);
  assert(Array.isArray(petsBody.data), "Admin pets payload is an array");
  console.log(`INFO: pets count = ${petsBody.data.length}`);

  let moaHistory;
  if (CHECK_MOA_HEALTH || CHECK_MOA_DRY_RUN) {
    const historyRes = await fetch(`${BASE}/api/admin/pet-sources/moa/sync`, {
      headers: { Authorization: `Bearer ${idToken}`, Cookie: cookieHeader },
    });
    const historyBody = await historyRes.json().catch(() => ({}));
    assert(historyRes.ok, `MOA sync history (${historyRes.status}) ${JSON.stringify(historyBody).slice(0, 500)}`);
    moaHistory = historyBody.data;

    if (CHECK_MOA_HEALTH) {
      const health = assessMoaSyncHistory(moaHistory);
      console.log(`INFO: MOA real sync age = ${health.ageHours}h; records = ${health.fetchedCount}`);
    }
  }

  // Optional production-safe MOA synchronization check
  if (CHECK_MOA_DRY_RUN) {
    const syncRes = await fetch(`${BASE}/api/admin/pet-sources/moa/sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        Cookie: cookieHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dryRun: true }),
    });
    const syncBody = await syncRes.json().catch(() => ({}));
    assert(syncRes.ok, `MOA dry-run (${syncRes.status}) ${JSON.stringify(syncBody).slice(0, 500)}`);
    const dryRun = assessMoaDryRun(syncBody.data, moaHistory?.source?.last_successful_record_count);
    console.log(`INFO: MOA dry-run records = ${dryRun.completeCount}`);

    if (MOA_DRY_RUN_ONLY) {
      console.log("\n=== MOA live check passed ===");
      return;
    }
  }

  // 4) Unauthenticated should be blocked
  const deniedRes = await fetch(`${BASE}/api/admin/pets`);
  assert(deniedRes.status === 401 || deniedRes.status === 403, `Unauthenticated pets API blocked (${deniedRes.status})`);

  // 5) Home page SSR with admin cookie — look for the admin overview link
  const homeRes = await fetch(BASE + "/", {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  const homeHtml = await homeRes.text();
  assert(homeRes.ok, `GET / (${homeRes.status})`);
  const hasAdminLink = homeHtml.includes('href="/admin"') || homeHtml.includes('href=\\"/admin\\"');
  assert(hasAdminLink, "Home page includes /admin overview shortcut for admin session");

  // 6) Admin pets page SSR
  const pageRes = await fetch(`${BASE}/admin/pets`, {
    headers: { Cookie: cookieHeader },
    redirect: "manual",
    cache: "no-store",
  });
  assert(pageRes.status === 200, `GET /admin/pets (${pageRes.status}, location=${pageRes.headers.get("location")})`);
  const pageHtml = await pageRes.text();
  assert(
    pageHtml.includes("Pets") || pageHtml.includes("毛孩") || pageHtml.includes("Operations"),
    "Admin pets page renders expected chrome",
  );
  assert(!pageHtml.includes("沒有權限"), "Admin pets page is not the 403 gate");
  assert(!pageHtml.includes("/login\">"), "Admin pets page did not bounce to login chrome");

  console.log("\n=== All live checks passed ===");
}

main().catch((err) => {
  console.error("\nFAIL:", err.message);
  process.exit(1);
});
