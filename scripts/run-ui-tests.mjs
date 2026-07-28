import { spawn } from "node:child_process";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const server = spawn(
  process.execPath,
  [resolve(repositoryRoot, "scripts", "start-standalone-test-server.mjs")],
  {
    cwd: repositoryRoot,
    stdio: ["ignore", "inherit", "inherit"],
  },
);

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`UI test server exited with code ${server.exitCode}.`);
    }
    try {
      const response = await fetch("http://127.0.0.1:3100");
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error("Timed out waiting for the UI test server.");
}

try {
  await waitForServer();
  const tests = spawn(
    process.execPath,
    [resolve(repositoryRoot, "node_modules", "@playwright", "test", "cli.js"), "test"],
    {
      cwd: repositoryRoot,
      stdio: "inherit",
    },
  );
  const exitCode = await new Promise((resolveExit) => {
    tests.once("exit", (code) => resolveExit(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  server.kill();
}
