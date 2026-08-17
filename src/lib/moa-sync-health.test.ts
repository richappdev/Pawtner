import { describe, expect, it } from "vitest";

import { assessMoaDryRun, assessMoaSyncHistory } from "../../scripts/moa-sync-health.mjs";

const now = new Date("2026-08-17T12:00:00.000Z");

function healthyHistory(overrides = {}) {
  return {
    source: {
      last_successful_sync_at: "2026-08-17T10:30:00.000Z",
      last_successful_record_count: 120,
    },
    runs: [
      {
        status: "succeeded",
        dry_run: false,
        started_at: "2026-08-17T10:30:00.000Z",
        finished_at: "2026-08-17T10:31:00.000Z",
        fetched_count: 120,
        error_count: 0,
      },
    ],
    ...overrides,
  };
}

describe("MOA synchronization health", () => {
  it("accepts a fresh, non-empty real synchronization", () => {
    expect(assessMoaSyncHistory(healthyHistory(), { now })).toEqual({
      ageHours: 1.5,
      fetchedCount: 120,
    });
  });

  it.each([
    ["stale", healthyHistory({ source: { last_successful_sync_at: "2026-08-15T10:30:00.000Z", last_successful_record_count: 120 } })],
    ["failed", healthyHistory({ runs: [{ ...healthyHistory().runs[0], status: "failed" }] })],
    ["rejected", healthyHistory({ runs: [{ ...healthyHistory().runs[0], status: "rejected" }] })],
    ["empty", healthyHistory({ runs: [{ ...healthyHistory().runs[0], fetched_count: 0 }] })],
  ])("rejects a %s real synchronization", (_label, history) => {
    expect(() => assessMoaSyncHistory(history, { now })).toThrow();
  });

  it("rejects a dry run that falls below half of the previous successful feed", () => {
    expect(() => assessMoaDryRun(
      { dryRun: true, completeCount: 49, reconciliation: { accepted: true } },
      100,
    )).toThrow(/reduced/i);
  });
});
