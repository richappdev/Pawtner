import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = resolve(repositoryRoot, ".next", "standalone");

loadEnvConfig(repositoryRoot);
Object.assign(process.env, {
  PAWTNER_ENV: "local",
  NEXT_PUBLIC_PAWTNER_ENV: "local",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "ui-test-public-key",
  NEXT_PUBLIC_FIREBASE_API_KEY: "ui-test-firebase-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "pawtner-local.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pawtner-local",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:local",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIREBASE_ADMIN_PROJECT_ID: "pawtner-local",
});
process.env.HOSTNAME ??= "127.0.0.1";
process.env.PORT ??= "3100";

await cp(resolve(repositoryRoot, "public"), resolve(standaloneRoot, "public"), {
  force: true,
  recursive: true,
});
await mkdir(resolve(standaloneRoot, ".next"), { recursive: true });
await cp(
  resolve(repositoryRoot, ".next", "static"),
  resolve(standaloneRoot, ".next", "static"),
  { force: true, recursive: true },
);

process.chdir(standaloneRoot);
await import(pathToFileURL(resolve(standaloneRoot, "server.js")).href);
