import { createClient } from "@supabase/supabase-js";
import { mapMoaRecord, type MappedMoaPet, type MoaRawRecord } from "../_shared/moa.ts";

const PAGE_SIZE = 1_000;
const BATCH_SIZE = 250;
const MAX_RETRIES = 4;
const SOURCE_KEY = "moa-animal-adoption";
const MOA_URL = "https://data.moa.gov.tw/Service/OpenData/TransService.aspx";
const UNIT_ID = "QcbUEzN6E6DL";
const FUNCTION_NAME = "sync-moa-pets";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

type LogFields = Record<string, unknown>;

function log(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const message = JSON.stringify({
    timestamp: new Date().toISOString(),
    function: FUNCTION_NAME,
    event,
    ...fields,
  });

  if (level === "error") console.error(message);
  else if (level === "warn") console.warn(message);
  else console.info(message);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function fetchPage(skip: number, runId: string): Promise<MoaRawRecord[]> {
  const url = new URL(MOA_URL);
  url.searchParams.set("UnitId", UNIT_ID);
  url.searchParams.set("$top", String(PAGE_SIZE));
  url.searchParams.set("$skip", String(skip));

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const attemptStartedAt = performance.now();
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "Pawtner-MOA-Sync/1.0" },
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) {
        if (response.status < 500 && response.status !== 429) {
          throw new Error(`MOA request failed with ${response.status}`);
        }
        throw new Error(`transient MOA response ${response.status}`);
      }
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error("MOA response was not an array");
      log("info", "page_fetched", {
        runId,
        skip,
        pageSize: PAGE_SIZE,
        receivedCount: payload.length,
        attempt: attempt + 1,
        durationMs: Math.round(performance.now() - attemptStartedAt),
      });
      return payload as MoaRawRecord[];
    } catch (error) {
      lastError = error;
      if (attempt + 1 < MAX_RETRIES) {
        const retryDelayMs = 500 * (2 ** attempt);
        log("warn", "page_fetch_retry", {
          runId,
          skip,
          attempt: attempt + 1,
          retryDelayMs,
          error: errorMessage(error),
        });
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("MOA request failed");
}

Deno.serve(async (request) => {
  const invocationStartedAt = performance.now();
  if (request.method !== "POST") {
    log("warn", "request_rejected", { reason: "method_not_allowed", method: request.method });
    return json({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("MOA_SYNC_SECRET");
  if (!expectedSecret || request.headers.get("x-sync-secret") !== expectedSecret) {
    log("warn", "request_rejected", { reason: "unauthorized" });
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    log("error", "configuration_missing", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    return json({ error: "Missing server configuration" }, 500);
  }

  const body = await request.json().catch(() => ({})) as { dryRun?: boolean; trigger?: unknown };
  const dryRun = body.dryRun === true;
  const trigger = body.trigger === "cron" || body.trigger === "admin" ? body.trigger : "unknown";
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: runId, error: startError } = await db.rpc("start_pet_source_sync", {
    p_source_key: SOURCE_KEY,
    p_dry_run: dryRun,
  });
  if (startError || !runId) {
    log("warn", "sync_start_rejected", {
      dryRun,
      trigger,
      error: startError?.message ?? "Unable to start sync",
    });
    return json({ error: startError?.message ?? "Unable to start sync" }, 409);
  }

  log("info", "sync_started", {
    runId,
    dryRun,
    trigger,
    pageSize: PAGE_SIZE,
    batchSize: BATCH_SIZE,
  });

  let completeCount = 0;
  let invalidCount = 0;
  let pageNumber = 0;
  let batchNumber = 0;
  try {
    for (let skip = 0; ; skip += PAGE_SIZE) {
      pageNumber += 1;
      const page = await fetchPage(skip, runId);
      const mapped = (await Promise.all(page.map((record) => mapMoaRecord(record))))
        .filter((record): record is MappedMoaPet => record !== null);
      const pageInvalidCount = page.length - mapped.length;
      invalidCount += pageInvalidCount;
      completeCount += mapped.length;
      log("info", "page_mapped", {
        runId,
        pageNumber,
        receivedCount: page.length,
        validCount: mapped.length,
        invalidCount: pageInvalidCount,
        cumulativeValidCount: completeCount,
        cumulativeInvalidCount: invalidCount,
      });

      for (let offset = 0; offset < mapped.length; offset += BATCH_SIZE) {
        batchNumber += 1;
        const batch = mapped.slice(offset, offset + BATCH_SIZE);
        const batchStartedAt = performance.now();
        const { data: batchResult, error } = await db.rpc("ingest_pet_source_batch", {
          p_run_id: runId,
          p_records: batch,
        });
        if (error) throw new Error(error.message);
        log("info", "batch_ingested", {
          runId,
          pageNumber,
          batchNumber,
          batchRecordCount: batch.length,
          result: batchResult,
          durationMs: Math.round(performance.now() - batchStartedAt),
        });
      }
      if (page.length < PAGE_SIZE) break;
    }

    if (completeCount === 0) throw new Error("MOA returned no valid records");
    const { data: result, error } = await db.rpc("finish_pet_source_sync", {
      p_run_id: runId,
      p_complete_count: completeCount,
    });
    if (error) throw new Error(error.message);
    const accepted = typeof result === "object" && result !== null &&
      "accepted" in result && result.accepted === true;
    log(accepted ? "info" : "warn", accepted ? "sync_completed" : "sync_rejected", {
      runId,
      dryRun,
      trigger,
      pageCount: pageNumber,
      batchCount: batchNumber,
      completeCount,
      invalidCount,
      reconciliation: result,
      durationMs: Math.round(performance.now() - invocationStartedAt),
    });
    return json({ runId, dryRun, completeCount, invalidCount, reconciliation: result });
  } catch (error) {
    const message = errorMessage(error);
    const { error: failureRecordError } = await db.rpc("fail_pet_source_sync", {
      p_run_id: runId,
      p_error: message,
    });
    log("error", "sync_failed", {
      runId,
      dryRun,
      trigger,
      pageCount: pageNumber,
      batchCount: batchNumber,
      completeCount,
      invalidCount,
      error: message,
      failureRecorded: !failureRecordError,
      failureRecordError: failureRecordError?.message,
      durationMs: Math.round(performance.now() - invocationStartedAt),
    });
    return json({ runId, error: message }, 502);
  }
});
