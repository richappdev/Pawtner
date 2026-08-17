const DEFAULT_MAX_AGE_HOURS = 26;

function requireNumber(value, message) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(message);
  return value;
}

export function assessMoaSyncHistory(
  payload,
  { now = new Date(), maxAgeHours = DEFAULT_MAX_AGE_HOURS } = {},
) {
  const source = payload?.source;
  const runs = Array.isArray(payload?.runs) ? payload.runs : [];
  if (!source?.last_successful_sync_at) throw new Error("MOA has no successful real synchronization");

  const successfulAt = new Date(source.last_successful_sync_at);
  const ageHours = (now.getTime() - successfulAt.getTime()) / 3_600_000;
  if (!Number.isFinite(ageHours) || ageHours < 0 || ageHours > maxAgeHours) {
    throw new Error(`MOA real synchronization is stale (${ageHours.toFixed(1)} hours)`);
  }

  const latestReal = runs.find((run) => run?.dry_run === false);
  if (!latestReal) throw new Error("MOA has no observable real synchronization run");
  if (latestReal.status === "failed" || latestReal.status === "rejected") {
    throw new Error(`Latest MOA real synchronization was ${latestReal.status}`);
  }
  if (latestReal.status !== "succeeded" || !latestReal.finished_at) {
    throw new Error(`Latest MOA real synchronization is ${latestReal.status ?? "invalid"}`);
  }

  const fetchedCount = requireNumber(latestReal.fetched_count, "MOA fetched count is unavailable");
  if (fetchedCount <= 0) throw new Error("Latest MOA real synchronization was empty");
  if (requireNumber(latestReal.error_count, "MOA error count is unavailable") > 0) {
    throw new Error("Latest MOA real synchronization recorded errors");
  }

  return { ageHours: Number(ageHours.toFixed(2)), fetchedCount };
}

export function assessMoaDryRun(payload, previousSuccessfulCount) {
  if (payload?.dryRun !== true) throw new Error("MOA validation did not run in dry-run mode");
  if (payload?.reconciliation?.accepted !== true) throw new Error("MOA dry-run reconciliation was rejected");

  const completeCount = requireNumber(payload.completeCount, "MOA dry-run count is unavailable");
  if (completeCount <= 0) throw new Error("MOA dry-run feed was empty");
  if (
    typeof previousSuccessfulCount === "number"
    && previousSuccessfulCount > 0
    && completeCount < Math.ceil(previousSuccessfulCount * 0.5)
  ) {
    throw new Error("MOA dry-run feed was reduced below half of the previous successful feed");
  }

  return { completeCount };
}
