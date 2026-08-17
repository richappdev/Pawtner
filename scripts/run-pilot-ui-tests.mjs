import { spawn } from "node:child_process";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const appOrigin = "http://localhost:3000";
const harness = spawn(process.execPath, [resolve(repositoryRoot, "scripts", "dev-local.mjs")], {
  cwd: repositoryRoot,
  stdio: ["ignore", "inherit", "inherit"],
});

async function waitForHarness() {
  // A fresh CI runner may need several minutes to pull Supabase containers and
  // download the pinned Firebase CLI before Next.js can start.
  const deadline = Date.now() + 360_000;
  while (Date.now() < deadline) {
    if (harness.exitCode !== null) throw new Error(`Pilot harness exited with code ${harness.exitCode}.`);
    try {
      const response = await fetch(`${appOrigin}/login`);
      if (response.ok) return;
    } catch {
      // Supabase, Firebase Auth, fixture seeding, and Next.js are still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error("Timed out waiting for the closed-pilot harness.");
}

try {
  await waitForHarness();
  const tests = spawn(
    process.execPath,
    [
      resolve(repositoryRoot, "node_modules", "@playwright", "test", "cli.js"),
      "test",
      "tests/ui/pilot-roles.spec.ts",
      "--workers=1",
    ],
    {
      cwd: repositoryRoot,
      // Match the hostname reported by Next.js. Mixing localhost and 127.0.0.1
      // causes Next.js 16 to block development resources as cross-origin.
      env: { ...process.env, PLAYWRIGHT_BASE_URL: appOrigin },
      stdio: "inherit",
    },
  );
  process.exitCode = await new Promise((resolveExit) => {
    tests.once("exit", (code) => resolveExit(code ?? 1));
  });
} finally {
  harness.kill("SIGTERM");
}
