// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONSENT_STORAGE_KEY, OPEN_CONSENT_SETTINGS_EVENT } from "@/lib/firebase/consent";

const { trackEventMock, applyConsentMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
  applyConsentMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/pets/private-id" }));
vi.mock("next/web-vitals", () => ({ useReportWebVitals: vi.fn() }));
vi.mock("@/lib/firebase/observability", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/firebase/observability")>();
  return {
    ...original,
    applyObservabilityConsent: applyConsentMock,
    isFirebaseObservabilityEnabled: () => true,
    trackEvent: trackEventMock,
  };
});

import { FirebaseObservability } from "@/components/firebase-observability";

describe("FirebaseObservability", () => {
  beforeEach(() => {
    localStorage.clear();
    trackEventMock.mockReset();
    applyConsentMock.mockReset();
  });

  afterEach(cleanup);

  it("shows accessible opt-in controls and persists necessary-only", () => {
    render(<FirebaseObservability />);
    expect(screen.getByRole("region", { name: "隱私權設定" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "僅使用必要功能" }));
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? "{}").analytics).toBe("denied");
    expect(screen.queryByRole("region", { name: "隱私權設定" })).not.toBeInTheDocument();
  });

  it("tracks a normalized page only after stored opt-in", async () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      version: 1,
      analytics: "granted",
      updatedAt: "2026-07-31T08:00:00.000Z",
    }));
    render(<FirebaseObservability />);
    await waitFor(() => expect(trackEventMock).toHaveBeenCalledWith("page_view", {
      page_path: "/pets/[id]",
      page_location: "http://localhost:3000/pets/[id]",
    }));
    expect(applyConsentMock).toHaveBeenCalledWith("granted");
  });

  it("reopens settings so granted consent can be withdrawn", async () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      version: 1,
      analytics: "granted",
      updatedAt: "2026-07-31T08:00:00.000Z",
    }));
    render(<FirebaseObservability />);
    window.dispatchEvent(new Event(OPEN_CONSENT_SETTINGS_EVENT));
    expect(await screen.findByRole("region", { name: "隱私權設定" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "僅使用必要功能" }));
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? "{}").analytics).toBe("denied");
  });
});
