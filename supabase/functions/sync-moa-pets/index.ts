import { createClient } from "@supabase/supabase-js";
import { mapMoaRecord, type MappedMoaPet, type MoaRawRecord } from "../_shared/moa.ts";

const PAGE_SIZE = 1_000;
const BATCH_SIZE = 250;
const MAX_RETRIES = 4;
const SOURCE_KEY = "moa-animal-adoption";
const MOA_URL = "https://data.moa.gov.tw/Service/OpenData/TransService.aspx";
const UNIT_ID = "QcbUEzN6E6DL";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function fetchPage(skip: number): Promise<MoaRawRecord[]> {
  const url = new URL(MOA_URL);
  url.searchParams.set("UnitId", UNIT_ID);
  url.searchParams.set("$top", String(PAGE_SIZE));
  url.searchParams.set("$skip", String(skip));

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
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
      return payload as MoaRawRecord[];
    } catch (error) {
      lastError = error;
      if (attempt + 1 < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("MOA request failed");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expectedSecret = Deno.env.get("MOA_SYNC_SECRET");
  if (!expectedSecret || request.headers.get("x-sync-secret") !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Missing server configuration" }, 500);

  const body = await request.json().catch(() => ({})) as { dryRun?: boolean };
  const dryRun = body.dryRun === true;
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: runId, error: startError } = await db.rpc("start_pet_source_sync", {
    p_source_key: SOURCE_KEY,
    p_dry_run: dryRun,
  });
  if (startError || !runId) return json({ error: startError?.message ?? "Unable to start sync" }, 409);

  let completeCount = 0;
  let invalidCount = 0;
  try {
    for (let skip = 0; ; skip += PAGE_SIZE) {
      const page = await fetchPage(skip);
      const mapped = (await Promise.all(page.map((record) => mapMoaRecord(record))))
        .filter((record): record is MappedMoaPet => record !== null);
      invalidCount += page.length - mapped.length;
      completeCount += mapped.length;

      for (let offset = 0; offset < mapped.length; offset += BATCH_SIZE) {
        const { error } = await db.rpc("ingest_pet_source_batch", {
          p_run_id: runId,
          p_records: mapped.slice(offset, offset + BATCH_SIZE),
        });
        if (error) throw new Error(error.message);
      }
      if (page.length < PAGE_SIZE) break;
    }

    if (completeCount === 0) throw new Error("MOA returned no valid records");
    const { data: result, error } = await db.rpc("finish_pet_source_sync", {
      p_run_id: runId,
      p_complete_count: completeCount,
    });
    if (error) throw new Error(error.message);
    return json({ runId, dryRun, completeCount, invalidCount, reconciliation: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync failure";
    await db.rpc("fail_pet_source_sync", { p_run_id: runId, p_error: message });
    return json({ runId, error: message }, 502);
  }
});
