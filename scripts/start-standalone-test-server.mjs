import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = resolve(repositoryRoot, ".next", "standalone");

loadEnvConfig(repositoryRoot);
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
