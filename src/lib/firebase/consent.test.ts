import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CONSENT_STORAGE_KEY,
  getEffectiveConsent,
  readStoredConsent,
  writeConsent,
} from "@/lib/firebase/consent";

function memoryStorage(initial?: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

afterEach(() => vi.useRealTimers());

describe("Firebase observability consent", () => {
  it("defaults missing, corrupt, and outdated choices to denied", () => {
    expect(getEffectiveConsent(memoryStorage())).toBe("denied");
    expect(getEffectiveConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: "{" }))).toBe("denied");
    expect(getEffectiveConsent(memoryStorage({
      [CONSENT_STORAGE_KEY]: JSON.stringify({ version: 0, analytics: "granted" }),
    }))).toBe("denied");
  });

  it("persists a versioned choice", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T08:00:00.000Z"));
    const storage = memoryStorage();

    writeConsent("granted", storage);

    expect(readStoredConsent(storage)).toEqual({
      version: 1,
      analytics: "granted",
      updatedAt: "2026-07-31T08:00:00.000Z",
    });
  });

  it("keeps the current-page choice when storage throws", () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error("blocked"); };
    expect(() => writeConsent("denied", storage)).not.toThrow();
  });
});
