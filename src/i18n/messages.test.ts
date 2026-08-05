import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translation catalogs", () => {
  it("provides non-empty Traditional Chinese messages", async () => {
    const root = path.resolve(process.cwd(), "messages");
    const traditionalChinese = await readFile(path.join(root, "zh-TW.json"), "utf8").then(JSON.parse);

    for (const key of leafKeys(traditionalChinese)) {
      const value = key.split(".").reduce<unknown>(
        (current, part) => (current as Record<string, unknown>)[part],
        traditionalChinese,
      );
      expect(value, key).toEqual(expect.any(String));
      expect((value as string).trim(), key).not.toBe("");
    }
  });
});
