import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { getAdminDashboardStats } from "@/lib/admin/dashboard-stats";

interface RecordedCall {
  table: string;
  select?: { columns: string; options: { count: string; head: boolean } };
  filters: Array<{ kind: "eq" | "in"; column: string; value: unknown }>;
}

function createSupabaseMock(
  results: Array<{ count: number | null; error: { message: string } | null }>,
) {
  const calls: RecordedCall[] = [];
  let resultIndex = 0;

  const client = {
    from(table: string) {
      const call: RecordedCall = { table, filters: [] };
      const result = results[resultIndex++];
      calls.push(call);

      const builder = {
        select(columns: string, options: { count: string; head: boolean }) {
          call.select = { columns, options };
          return builder;
        },
        eq(column: string, value: unknown) {
          call.filters.push({ kind: "eq", column, value });
          return builder;
        },
        in(column: string, value: unknown[]) {
          call.filters.push({ kind: "in", column, value });
          return builder;
        },
        then<TResult1 = typeof result, TResult2 = never>(
          onFulfilled?: ((value: typeof result) => TResult1 | PromiseLike<TResult1>) | null,
          onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve(result).then(onFulfilled, onRejected);
        },
      };

      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}

function successfulResults(): Array<{
  count: number | null;
  error: { message: string } | null;
}> {
  return Array.from({ length: 12 }, (_, index) => ({
    count: index,
    error: null,
  }));
}

describe("getAdminDashboardStats", () => {
  it("runs exact head-only counts with the intended workflow filters", async () => {
    const { client, calls } = createSupabaseMock(successfulResults());
    const stats = await getAdminDashboardStats(client);

    expect(calls).toHaveLength(12);
    expect(calls.every((call) => (
      call.select?.options.count === "exact" && call.select.options.head === true
    ))).toBe(true);
    expect(calls[0]).toMatchObject({
      table: "pets",
      filters: [
        { kind: "eq", column: "source_type", value: "private_foster" },
        { kind: "eq", column: "review_status", value: "pending_review" },
      ],
    });
    expect(calls[1]).toMatchObject({
      table: "pet_source_records",
      filters: [{ kind: "eq", column: "publication_status", value: "pending_review" }],
    });
    expect(calls[2]).toMatchObject({
      table: "pet_source_records",
      filters: [{ kind: "eq", column: "quality_status", value: "blocked" }],
    });
    expect(calls[3]).toMatchObject({
      table: "foster_profiles",
      filters: [{ kind: "in", column: "status", value: ["submitted", "under_review"] }],
    });
    expect(calls[5]).toMatchObject({
      table: "orders",
      filters: [{ kind: "in", column: "status", value: ["paid", "fulfilled"] }],
    });
    expect(calls[8]).toMatchObject({ table: "pets_public", filters: [] });
    expect(calls[10]).toMatchObject({
      table: "adoption_applications",
      filters: [{
        kind: "in",
        column: "status",
        value: ["screening", "interview", "home_check", "trial"],
      }],
    });
    expect(stats.actionRequired.map((metric) => metric.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(stats.platformHealth.map((metric) => metric.value)).toEqual([8, 9, 10, 11]);
    expect(stats.hasErrors).toBe(false);
  });

  it("keeps zero counts distinct from unavailable metrics", async () => {
    const results = successfulResults();
    results[0] = { count: 0, error: null };
    results[1] = { count: null, error: { message: "permission denied" } };
    const { client } = createSupabaseMock(results);

    const stats = await getAdminDashboardStats(client);

    expect(stats.actionRequired[0]).toMatchObject({ value: 0, error: undefined });
    expect(stats.actionRequired[1]).toMatchObject({ value: null, error: true });
    expect(stats.hasErrors).toBe(true);
  });
});
