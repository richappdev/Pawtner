import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args, options = {}) {
  const result = spawnSync(npx, args, { stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(args) {
  const result = spawnSync(npx, args, { encoding: "utf8", shell: false });
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function runNode(args, options = {}) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function parseEnv(output) {
  return Object.fromEntries(output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(?:"([\s\S]*)"|(.*))$/);
    return match ? [[match[1], match[2] ?? match[3] ?? ""]] : [];
  }));
}

function waitForPort(port, timeoutMs = 60_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) reject(new Error(`Timed out waiting for port ${port}`));
        else setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

run(["supabase", "start"]);
run(["supabase", "db", "reset", "--local", "--yes"]);
const local = parseEnv(capture(["supabase", "status", "-o", "env"]));
if (!local.ANON_KEY || !local.SERVICE_ROLE_KEY) {
  throw new Error("Supabase CLI status did not return ANON_KEY and SERVICE_ROLE_KEY");
}
const appEnv = {
  ...process.env,
  PAWTNER_ENV: "local",
  NEXT_PUBLIC_PAWTNER_ENV: "local",
  PAWTNER_COMMIT_SHA: "local",
  PAWTNER_IMAGE_DIGEST: "local",
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL ?? "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "pawtner-local.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pawtner-local",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:local",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIREBASE_ADMIN_PROJECT_ID: "pawtner-local",
  FEATURE_FIREBASE_AUTH_ENABLED: "true",
  NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED: "true",
  FEATURE_GOVERNMENT_PETS_ENABLED: "true",
  FEATURE_CLOSED_PILOT_ADOPTION_OPERATIONS_ENABLED: "true",
  NEXT_PUBLIC_FEATURE_CLOSED_PILOT_ADOPTION_OPERATIONS_ENABLED: "true",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  STAGING_FIXTURE_PASSWORD: process.env.STAGING_FIXTURE_PASSWORD ?? "PawtnerLocal123!",
};

const emulator = spawn(npx, ["-y", "firebase-tools@latest", "emulators:start", "--only", "auth", "--project", "pawtner-local", "--config", "firebase.staging.json"], {
  env: appEnv,
  stdio: "inherit",
  shell: false,
});

try {
  await waitForPort(9099);
  runNode(["scripts/seed-closed-pilot-fixtures.mjs"], { env: appEnv });
  const next = spawn(npx, ["next", "dev"], { env: appEnv, stdio: "inherit", shell: false });
  const stop = () => next.kill();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  process.exitCode = await new Promise((resolve) => next.once("exit", (code) => resolve(code ?? 0)));
} finally {
  emulator.kill();
}
