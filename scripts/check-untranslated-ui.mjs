import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["src/app/[locale]", "src/components"];
const allow = new Set(["Pawtner", "pilot@example.com", "app.developer.rich@gmail.com"]);
const technical = /^[A-Z0-9][A-Z0-9+_.:/ -]*$/;
const findings = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) await inspect(file);
  }
}

function report(file, source, index, value) {
  const line = source.slice(0, index).split(/\r?\n/).length;
  findings.push(`${file}:${line}: ${JSON.stringify(value.trim())}`);
}

async function inspect(file) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/<[A-Za-z][^>]*>\s*([^<>{}\r\n]+?)\s*</g)) {
    const value = match[1].trim();
    if (!value || !/^[\p{L}]/u.test(value) || allow.has(value) || technical.test(value)) continue;
    report(file, source, match.index, value);
  }
  for (const match of source.matchAll(/\b(?:aria-label|title|placeholder|alt)=(['"])(.*?)\1/g)) {
    const value = match[2].trim();
    if (!value || allow.has(value) || technical.test(value) || !/[\p{L}]/u.test(value)) continue;
    report(file, source, match.index, value);
  }
}

await Promise.all(roots.map(visit));
if (findings.length) {
  console.error("Untranslated user-facing JSX literals found:\n" + findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log("No untranslated user-facing JSX literals found.");
}
