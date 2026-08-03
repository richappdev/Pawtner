"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReportWebVitals } from "next/web-vitals";

import { Button } from "@/components/ui/button";
import {
  getConsentSnapshot,
  OPEN_CONSENT_SETTINGS_EVENT,
  subscribeToConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/firebase/consent";
import {
  applyObservabilityConsent,
  isFirebaseObservabilityEnabled,
  sanitizeRoutePath,
  trackEvent,
} from "@/lib/firebase/observability";

const WEB_VITAL_NAMES = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);

export function FirebaseObservability() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribeToConsent, getConsentSnapshot, () => null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const lastTrackedPath = useRef<string | undefined>(undefined);
  const enabled = isFirebaseObservabilityEnabled();

  useEffect(() => {
    const onOpen = () => setSettingsOpen(true);
    window.addEventListener(OPEN_CONSENT_SETTINGS_EVENT, onOpen);
    return () => {
      window.removeEventListener(OPEN_CONSENT_SETTINGS_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (choice) void applyObservabilityConsent(choice);
  }, [choice]);

  useEffect(() => {
    if (choice !== "granted" || !pathname || lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
    const pagePath = sanitizeRoutePath(pathname);
    void trackEvent("page_view", {
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
    });
  }, [choice, pathname]);

  useReportWebVitals((metric) => {
    if (!WEB_VITAL_NAMES.has(metric.name)) return;
    void trackEvent("web_vital", {
      metric_name: metric.name as "CLS" | "FCP" | "INP" | "LCP" | "TTFB",
      metric_value: metric.name === "CLS" ? Math.round(metric.value * 1000) : Math.round(metric.value),
      metric_delta: metric.name === "CLS" ? Math.round(metric.delta * 1000) : Math.round(metric.delta),
      metric_rating: metric.rating,
      page_path: sanitizeRoutePath(window.location.pathname),
    });
  });

  if (!enabled || (choice !== null && !settingsOpen)) return null;

  function choose(nextChoice: ConsentChoice) {
    writeConsent(nextChoice);
    setSettingsOpen(false);
  }

  return (
    <section
      aria-label="隱私權設定"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-[20px] border bg-surface p-5 shadow-[var(--shadow-lift)] sm:p-6"
    >
      <h2 className="display text-xl">您的隱私選擇</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        我們只會在您同意後，使用 Firebase Analytics 與 Performance 收集匿名化的使用情形和效能資料。
        必要的登入與安全功能不受此選擇影響。
      </p>
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={() => choose("denied")}>
          僅使用必要功能
        </Button>
        <Button type="button" onClick={() => choose("granted")}>
          允許分析資料
        </Button>
      </div>
    </section>
  );
}
