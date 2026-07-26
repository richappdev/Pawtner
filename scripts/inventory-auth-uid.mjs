#!/usr/bin/env node
/**
 * Inventory auth.uid(), auth.users, Supabase Auth helpers, and service-role usage.
 * Usage: node scripts/inventory-auth-uid.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, filter) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

function countMatches(file, pattern) {
  const text = fs.readFileSync(file, "utf8");
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

const sqlFiles = walk(path.join(root, "supabase"), (f) => f.endsWith(".sql"));
const srcFiles = walk(path.join(root, "src"), (f) => /\.(ts|tsx)$/.test(f));

console.log("=== auth.uid() in SQL ===");
let uidTotal = 0;
for (const file of sqlFiles) {
  const n = countMatches(file, /auth\.uid\(\)/g);
  if (n) {
    uidTotal += n;
    console.log(`${n}\t${path.relative(root, file)}`);
  }
}
console.log(`TOTAL auth.uid(): ${uidTotal}\n`);

console.log("=== auth.users references in SQL ===");
let usersTotal = 0;
for (const file of sqlFiles) {
  const n = countMatches(file, /auth\.users/g);
  if (n) {
    usersTotal += n;
    console.log(`${n}\t${path.relative(root, file)}`);
  }
}
console.log(`TOTAL auth.users: ${usersTotal}\n`);

console.log("=== Supabase Auth helpers in src ===");
const authPatterns = [
  [/supabase\.auth\./g, "supabase.auth.*"],
  [/auth\.getUser\(/g, "getUser("],
  [/auth\.getClaims\(/g, "getClaims("],
  [/signInWithPassword/g, "signInWithPassword"],
  [/signUp\(/g, "signUp("],
];
for (const [pattern, label] of authPatterns) {
  let total = 0;
  for (const file of srcFiles) {
    const n = countMatches(file, pattern);
    if (n) {
      total += n;
      console.log(`${n}\t${label}\t${path.relative(root, file)}`);
    }
  }
  if (!total) console.log(`0\t${label}`);
}

console.log("\n=== service-role / createServiceClient in src ===");
for (const file of srcFiles) {
  const n = countMatches(file, /createServiceClient|serviceClient|SERVICE_ROLE/g);
  if (n) console.log(`${n}\t${path.relative(root, file)}`);
}
