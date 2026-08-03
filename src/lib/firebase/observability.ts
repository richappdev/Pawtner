import type { Analytics } from "firebase/analytics";
import type { FirebasePerformance } from "firebase/performance";

import { getEffectiveConsent, type ConsentChoice } from "@/lib/firebase/consent";
import { getFirebaseApp, getFirebaseWebConfig } from "@/lib/firebase/client";

type PetDimensions = {
  species: string;
  source_type: string;
  status: string;
  region_present: boolean;
};

export interface AnalyticsEventMap {
  page_view: { page_path: string; page_location: string };
  view_item_list: { item_list_id: "home_featured" | "explore_results"; result_count: number };
  filter_results: {
    has_query: boolean;
    has_species: boolean;
    has_region: boolean;
    has_source: boolean;
    result_count: number;
  };
  select_item: PetDimensions & { item_list_id: "home_featured" | "explore_results" };
  view_item: PetDimensions;
  generate_lead: PetDimensions & { lead_type: "pawtner_application" | "shelter_contact" };
  login: { method: "firebase" | "supabase" };
  sign_up: { method: "firebase" | "supabase" };
  add_to_wishlist: { species: string; source_type: string };
  questionnaire_complete: { questionnaire_version: string };
  application_submit: { source_type: string };
  web_vital: {
    metric_name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
    metric_value: number;
    metric_delta: number;
    metric_rating: "good" | "needs-improvement" | "poor";
    page_path: string;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

const PARAMETER_ALLOWLIST: { [K in AnalyticsEventName]: readonly (keyof AnalyticsEventMap[K])[] } = {
  page_view: ["page_path", "page_location"],
  view_item_list: ["item_list_id", "result_count"],
  filter_results: ["has_query", "has_species", "has_region", "has_source", "result_count"],
  select_item: ["item_list_id", "species", "source_type", "status", "region_present"],
  view_item: ["species", "source_type", "status", "region_present"],
  generate_lead: ["lead_type", "species", "source_type", "status", "region_present"],
  login: ["method"],
  sign_up: ["method"],
  add_to_wishlist: ["species", "source_type"],
  questionnaire_complete: ["questionnaire_version"],
  application_submit: ["source_type"],
  web_vital: ["metric_name", "metric_value", "metric_delta", "metric_rating", "page_path"],
};

let analyticsPromise: Promise<Analytics | null> | undefined;
let performanceInstance: FirebasePerformance | null | undefined;

export function isFirebaseObservabilityEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FIREBASE_OBSERVABILITY_ENABLED === "true";
}

export function sanitizeRoutePath(pathname: string): string {
  const clean = pathname.split(/[?#]/, 1)[0] || "/";
  return clean
    .replace(/\/pets\/[^/]+/g, "/pets/[id]")
    .replace(/\/donate\/[^/]+/g, "/donate/[orgSlug]")
    .replace(/\/admin\/pets\/[^/]+/g, "/admin/pets/[id]")
    .replace(/\/foster\/pets\/[^/]+/g, "/foster/pets/[id]");
}

export function sanitizeEventParameters<K extends AnalyticsEventName>(
  name: K,
  parameters: AnalyticsEventMap[K],
): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const key of PARAMETER_ALLOWLIST[name] as readonly string[]) {
    const value = (parameters as Record<string, unknown>)[key];
    if (typeof value === "string") safe[key] = value.slice(0, 100);
    if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    if (typeof value === "boolean") safe[key] = value;
  }
  return safe;
}

function supportsPerformance(): boolean {
  return typeof window !== "undefined"
    && typeof window.fetch === "function"
    && typeof window.Promise === "function"
    && typeof window.indexedDB !== "undefined"
    && typeof window.performance !== "undefined"
    && navigator.cookieEnabled;
}

async function initializeAnalyticsSafely(): Promise<Analytics | null> {
  if (!isFirebaseObservabilityEnabled() || getEffectiveConsent() !== "granted") return null;
  if (!getFirebaseWebConfig().measurementId) return null;
  try {
    const analyticsModule = await import("firebase/analytics");
    if (!(await analyticsModule.isSupported())) return null;
    const analytics = analyticsModule.initializeAnalytics(getFirebaseApp(), {
      config: {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    });
    analyticsModule.setConsent({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      personalization_storage: "denied",
    });
    analyticsModule.setAnalyticsCollectionEnabled(analytics, true);
    return analytics;
  } catch {
    return null;
  }
}

export function getFirebaseAnalytics(): Promise<Analytics | null> {
  analyticsPromise ??= initializeAnalyticsSafely();
  return analyticsPromise;
}

async function enablePerformanceSafely(): Promise<void> {
  if (!isFirebaseObservabilityEnabled() || getEffectiveConsent() !== "granted" || !supportsPerformance()) return;
  try {
    const { getPerformance } = await import("firebase/performance");
    performanceInstance ??= getPerformance(getFirebaseApp());
    performanceInstance.instrumentationEnabled = true;
    performanceInstance.dataCollectionEnabled = true;
  } catch {
    performanceInstance = null;
  }
}

export async function applyObservabilityConsent(choice: ConsentChoice): Promise<void> {
  if (!isFirebaseObservabilityEnabled()) return;
  if (choice === "granted") {
    const [analytics] = await Promise.all([getFirebaseAnalytics(), enablePerformanceSafely()]);
    if (analytics) {
      try {
        const { setAnalyticsCollectionEnabled, setConsent } = await import("firebase/analytics");
        setConsent({
          analytics_storage: "granted",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          personalization_storage: "denied",
        });
        setAnalyticsCollectionEnabled(analytics, true);
      } catch {
        // A telemetry preference change must never affect the application.
      }
    }
    return;
  }
  try {
    const { setAnalyticsCollectionEnabled, setConsent } = await import("firebase/analytics");
    const analytics = await analyticsPromise;
    if (analytics) {
      setAnalyticsCollectionEnabled(analytics, false);
      setConsent({
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        personalization_storage: "denied",
      });
    }
  } catch {
    // A telemetry shutdown must never affect the application.
  }
  if (performanceInstance) {
    performanceInstance.instrumentationEnabled = false;
    performanceInstance.dataCollectionEnabled = false;
  }
}

export async function trackEvent<K extends AnalyticsEventName>(
  name: K,
  parameters: AnalyticsEventMap[K],
): Promise<void> {
  if (!isFirebaseObservabilityEnabled() || getEffectiveConsent() !== "granted") return;
  try {
    const [analytics, { logEvent }] = await Promise.all([
      getFirebaseAnalytics(),
      import("firebase/analytics"),
    ]);
    if (analytics) {
      const emit = logEvent as (
        instance: Analytics,
        eventName: string,
        eventParameters: Record<string, string | number | boolean>,
      ) => void;
      emit(analytics, name, sanitizeEventParameters(name, parameters));
    }
  } catch {
    // Measurement is best-effort and must not affect product flows.
  }
}
