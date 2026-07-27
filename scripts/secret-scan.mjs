import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.endsWith("package-lock.json"));

const rules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["OpenAI secret", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["Supabase service-role token", /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
  ["hard-coded password", /\b(?:PASSWORD|password)\s*[:=]\s*["'][^"'$\n]{8,}["']/],
  ["Google/Firebase API key", /\bAIza[0-9A-Za-z_-]{30,}\b/],
];

const findings = [];
for (const file of files) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const [label, pattern] of rules) {
    if (pattern.test(content)) findings.push(`${file}: ${label}`);
  }
}

if (findings.length) {
  console.error("Potential tracked secrets found:\n" + findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} tracked files).`);
