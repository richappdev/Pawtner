"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Application = {
  id: string; pet_id: string; status: string; created_at: string;
  pet?: { name?: string } | null;
  application_status_history?: Array<{ id: string; to_status: string; created_at: string }>;
  application_private_notes?: Array<{ id: string; kind: string; note: string; created_at: string }>;
  adoption_followups?: Array<{ id: string; day_offset: number; due_at: string; submitted_at: string | null; outcome: string | null }>;
};

const transitions: Record<string, string[]> = {
  submitted: ["screening", "rejected", "withdrawn"], screening: ["interview", "rejected", "withdrawn"],
  interview: ["home_check", "trial", "rejected", "withdrawn"], home_check: ["trial", "rejected", "withdrawn"],
  trial: ["approved", "returned"], approved: ["adopted", "returned"], adopted: ["returned"],
};

export function ApplicationWorkbench({
  endpoint, basePath, detailId, reviewer = false,
}: { endpoint: string; basePath: string; detailId?: string; reviewer?: boolean }) {
  const [data, setData] = useState<Application | null>(null);
  const [items, setItems] = useState<Application[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "conflict">("loading");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [followupText, setFollowupText] = useState("");
  const load = useCallback(async (next?: string) => {
    try { const listUrl = next ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(next)}` : endpoint; const response = await fetch(detailId ? `${endpoint}/${detailId}` : listUrl, { cache: "no-store" }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.details?.onboardingStatus ? `Foster onboarding status: ${payload.error.details.onboardingStatus}` : payload.error?.message ?? "Unable to load applications.");
      if (detailId) setData(payload.data); else { setItems((current) => next ? [...current, ...(payload.data.items ?? [])] : payload.data.items ?? []); setCursor(payload.data.nextCursor ?? null); } setState("ready");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load applications."); setState("error"); }
  }, [detailId, endpoint]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function transition(status: string) {
    setMessage("");
    const response = await fetch(`/api/applications/${detailId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, note: note || undefined }) });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error?.message ?? "Transition failed."); setState(response.status === 409 ? "conflict" : "error"); return; }
    setNote(""); await load();
  }
  async function mutateFollowup(followupId: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/applications/${detailId}/followups/${followupId}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error?.message ?? "Follow-up action failed."); setState(response.status === 409 ? "conflict" : "error"); return; }
    setFollowupText(""); setNote(""); await load();
  }
  if (state === "loading") return <Card className="mt-8 animate-pulse">Loading application operations…</Card>;
  if ((state === "error" || state === "conflict") && !data && !items.length) return <Alert title={state === "conflict" ? "Application changed" : "Unable to load"} tone="danger"><p>{message}</p><Button className="mt-3" onClick={() => { setState("loading"); void load(); }}>Retry</Button></Alert>;
  if (!detailId) return items.length ? <div className="mt-8 space-y-4">{items.map((application) => <Card key={application.id} interactive><div className="flex items-center justify-between gap-4"><div><h2 className="display text-2xl">{application.pet?.name ?? `Application ${application.id.slice(0, 8)}`}</h2><p className="mt-1 text-sm text-muted">Submitted {new Date(application.created_at).toLocaleDateString()}</p></div><Badge>{application.status.replaceAll("_", " ")}</Badge></div><Link className="mt-4 inline-block font-bold text-accent" href={`${basePath}/${application.id}`}>Open application</Link></Card>)}{cursor ? <Button variant="secondary" onClick={() => { setState("loading"); void load(cursor); }}>Load more</Button> : null}</div> : <Card tone="mint" className="mt-8"><h2 className="display text-2xl">No applications found</h2><p className="mt-2 text-muted">The queue is empty for the current filters.</p></Card>;
  if (!data) return null;
  const allowed = transitions[data.status] ?? [];
  const visibleTransitions = reviewer ? allowed.filter((status) => status !== "withdrawn") : allowed.filter((status) => status === "withdrawn");
  return <div className="mt-8 space-y-6">
    {message ? <Alert title={state === "conflict" ? "Conflict" : "Action failed"} tone="danger">{message}</Alert> : null}
    <Card><div className="flex items-center justify-between"><h2 className="display text-2xl">{data.pet?.name ?? `Application ${data.id.slice(0, 8)}`}</h2><Badge>{data.status.replaceAll("_", " ")}</Badge></div>
      <ol className="mt-6 space-y-3 border-l pl-5">{data.application_status_history?.map((event) => <li key={event.id}><p className="font-bold capitalize">{event.to_status.replaceAll("_", " ")}</p><p className="text-xs text-muted">{new Date(event.created_at).toLocaleString()}</p></li>)}</ol>
    </Card>
    {reviewer && data.application_private_notes?.length ? <Card tone="warm"><h2 className="display text-2xl">Private reviewer notes</h2>{data.application_private_notes.map((privateNote) => <div className="mt-3" key={privateNote.id}><p className="text-xs font-bold uppercase">{privateNote.kind}</p><p>{privateNote.note}</p></div>)}</Card> : null}
    {visibleTransitions.length ? <Card><h2 className="display text-2xl">Available actions</h2>{reviewer ? <textarea className="mt-4 min-h-24 w-full rounded-xl border p-3" placeholder="Private note (required for rejection or return)" value={note} onChange={(event) => setNote(event.target.value)} /> : null}<div className="mt-4 flex flex-wrap gap-3">{visibleTransitions.map((status) => <Button key={status} variant={status === "rejected" || status === "returned" ? "danger" : "primary"} onClick={() => void transition(status)}>{status.replaceAll("_", " ")}</Button>)}</div></Card> : null}
    {data.adoption_followups?.length ? <Card tone="mint"><h2 className="display text-2xl">7 / 30 / 90-day follow-ups</h2>{data.adoption_followups.map((followup) => <div className="mt-5 border-t pt-4" key={followup.id}><p><strong>Day {followup.day_offset}</strong> · due {new Date(followup.due_at).toLocaleDateString()} · {followup.outcome ?? (followup.submitted_at ? "awaiting review" : "awaiting submission")}</p>{!reviewer && !followup.submitted_at && new Date(followup.due_at) <= new Date() ? <div><textarea className="mt-3 min-h-20 w-full rounded-xl border p-3" placeholder="How is the adoption going?" value={followupText} onChange={(event) => setFollowupText(event.target.value)} /><Button className="mt-2" disabled={!followupText.trim()} onClick={() => void mutateFollowup(followup.id, { action: "submit", response: { summary: followupText } })}>Submit check-in</Button></div> : null}{reviewer && followup.submitted_at && !followup.outcome ? <div className="mt-3 flex flex-wrap gap-2">{["stable", "needs_support", "returned"].map((outcome) => <Button key={outcome} size="sm" variant={outcome === "returned" ? "danger" : "secondary"} onClick={() => void mutateFollowup(followup.id, { action: "review", outcome, note: note || undefined })}>{outcome.replaceAll("_", " ")}</Button>)}</div> : null}</div>)}</Card> : null}
  </div>;
}
