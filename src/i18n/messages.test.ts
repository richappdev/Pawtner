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
  it("provide the same non-empty message keys for zh-TW and en", async () => {
    const root = path.resolve(process.cwd(), "messages");
    const [traditionalChinese, english] = await Promise.all([
      readFile(path.join(root, "zh-TW.json"), "utf8").then(JSON.parse),
      readFile(path.join(root, "en.json"), "utf8").then(JSON.parse),
    ]);

    expect(leafKeys(english).sort()).toEqual(leafKeys(traditionalChinese).sort());
    for (const catalog of [traditionalChinese, english]) {
      for (const key of leafKeys(catalog)) {
        const value = key.split(".").reduce<unknown>(
          (current, part) => (current as Record<string, unknown>)[part],
          catalog,
        );
        expect(value, key).toEqual(expect.any(String));
        expect((value as string).trim(), key).not.toBe("");
      }
    }
  });
});
