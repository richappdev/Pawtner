import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isAppLocale,
  localizePathname,
  resolveRequestLocale,
  stripLocalePrefix,
} from "./routing";

describe("locale routing contract", () => {
  it("supports only Traditional Chinese and English", () => {
    expect(SUPPORTED_LOCALES).toEqual(["zh-TW", "en"]);
    expect(DEFAULT_LOCALE).toBe("zh-TW");
    expect(isAppLocale("zh-TW")).toBe(true);
    expect(isAppLocale("en")).toBe(true);
    expect(isAppLocale("en-US")).toBe(false);
  });

  it("prefers a supported locale cookie over the browser language", () => {
    expect(resolveRequestLocale("en", "zh-TW,zh;q=0.9,en;q=0.8")).toBe("en");
  });

  it("matches supported browser languages and otherwise falls back to zh-TW", () => {
    expect(resolveRequestLocale(undefined, "en-US,en;q=0.9")).toBe("en");
    expect(resolveRequestLocale(undefined, "zh-Hant-TW,zh;q=0.9")).toBe("zh-TW");
    expect(resolveRequestLocale(undefined, "ja-JP,ja;q=0.9")).toBe("zh-TW");
  });

  it("adds and replaces locale prefixes without changing the remaining pathname", () => {
    expect(localizePathname("/admin/pets", "en")).toBe("/en/admin/pets");
    expect(localizePathname("/zh-TW/admin/pets", "en")).toBe("/en/admin/pets");
    expect(localizePathname("/en", "zh-TW")).toBe("/zh-TW");
    expect(stripLocalePrefix("/en/explore")).toBe("/explore");
  });
});
