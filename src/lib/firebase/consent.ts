export type ConsentChoice = "granted" | "denied";

export interface StoredConsent {
  version: 1;
  analytics: ConsentChoice;
  updatedAt: string;
}

export const CONSENT_STORAGE_KEY = "pawtner_privacy_consent";
export const CONSENT_CHANGED_EVENT = "pawtner:consent-changed";
export const OPEN_CONSENT_SETTINGS_EVENT = "pawtner:open-consent-settings";
let volatileConsent: ConsentChoice | null = null;

function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function readStoredConsent(storage = browserStorage()): StoredConsent | null {
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(CONSENT_STORAGE_KEY) ?? "null") as Partial<StoredConsent> | null;
    if (parsed?.version !== 1 || (parsed.analytics !== "granted" && parsed.analytics !== "denied")) {
      return null;
    }
    return {
      version: 1,
      analytics: parsed.analytics,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

export function getEffectiveConsent(storage = browserStorage()): ConsentChoice {
  return readStoredConsent(storage)?.analytics ?? volatileConsent ?? "denied";
}

export function getConsentSnapshot(): ConsentChoice | null {
  return readStoredConsent()?.analytics ?? volatileConsent;
}

export function subscribeToConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function writeConsent(choice: ConsentChoice, storage = browserStorage()): StoredConsent {
  const record: StoredConsent = {
    version: 1,
    analytics: choice,
    updatedAt: new Date().toISOString(),
  };
  let persisted = false;
  try {
    if (storage) {
      storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      persisted = true;
    }
  } catch {
    // Privacy choice remains effective for this page even when storage is blocked.
  }
  volatileConsent = persisted ? null : choice;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_CHANGED_EVENT, { detail: choice }));
  }
  return record;
}

export function openConsentSettings(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_CONSENT_SETTINGS_EVENT));
}
