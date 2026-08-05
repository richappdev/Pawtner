"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

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
  const t = useTranslations("Admin.applications");
  const actions = useTranslations("Actions");
  const enumTranslations = useTranslations("Enums") as unknown as (key: string) => string;
  const format = useFormatter();
  const enumLabel = (value: string) => enumTranslations(value);
  const [data, setData] = useState<Application | null>(null);
  const [items, setItems] = useState<Application[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "conflict">("loading");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [followupText, setFollowupText] = useState("");
  const load = useCallback(async (next?: string) => {
    try { const listUrl = next ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(next)}` : endpoint; const response = await fetch(detailId ? `${endpoint}/${detailId}` : listUrl, { cache: "no-store" }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? t("unableMessage"));
      if (detailId) setData(payload.data); else { setItems((current) => next ? [...current, ...(payload.data.items ?? [])] : payload.data.items ?? []); setCursor(payload.data.nextCursor ?? null); } setState("ready");
    } catch (error) { setMessage(error instanceof Error ? error.message : t("unableMessage")); setState("error"); }
  }, [detailId, endpoint, t]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function transition(status: string) {
    setMessage("");
    const response = await fetch(`/api/applications/${detailId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, note: note || undefined }) });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error?.message ?? t("transitionFailed")); setState(response.status === 409 ? "conflict" : "error"); return; }
    setNote(""); await load();
  }
  async function mutateFollowup(followupId: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/applications/${detailId}/followups/${followupId}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error?.message ?? t("followupFailed")); setState(response.status === 409 ? "conflict" : "error"); return; }
    setFollowupText(""); setNote(""); await load();
  }
  if (state === "loading") return <Card className="mt-8 animate-pulse">{t("loading")}</Card>;
  if ((state === "error" || state === "conflict") && !data && !items.length) return <Alert title={state === "conflict" ? t("changed") : t("unableToLoad")} tone="danger"><p>{message}</p><Button className="mt-3" onClick={() => { setState("loading"); void load(); }}>{actions("retry")}</Button></Alert>;
  if (!detailId) return items.length ? <div className="mt-8 space-y-4">{items.map((application) => <Card key={application.id} interactive><div className="flex items-center justify-between gap-4"><div><h2 className="display text-2xl">{application.pet?.name ?? `${t("openApplication")} ${application.id.slice(0, 8)}`}</h2><p className="mt-1 text-sm text-muted">{t("submittedAt", { date: format.dateTime(new Date(application.created_at), { dateStyle: "medium" }) })}</p></div><Badge>{enumLabel(application.status)}</Badge></div><Link className="mt-4 inline-block font-bold text-accent" href={`${basePath}/${application.id}`}>{t("openApplication")}</Link></Card>)}{cursor ? <Button variant="secondary" onClick={() => { setState("loading"); void load(cursor); }}>{actions("loadMore")}</Button> : null}</div> : <Card tone="mint" className="mt-8"><h2 className="display text-2xl">{t("none")}</h2><p className="mt-2 text-muted">{t("empty")}</p></Card>;
  if (!data) return null;
  const allowed = transitions[data.status] ?? [];
  const visibleTransitions = reviewer ? allowed.filter((status) => status !== "withdrawn") : allowed.filter((status) => status === "withdrawn");
  return <div className="mt-8 space-y-6">
    {message ? <Alert title={state === "conflict" ? t("conflict") : t("actionFailed")} tone="danger">{message}</Alert> : null}
    <Card><div className="flex items-center justify-between"><h2 className="display text-2xl">{data.pet?.name ?? `${t("openApplication")} ${data.id.slice(0, 8)}`}</h2><Badge>{enumLabel(data.status)}</Badge></div>
      <ol className="mt-6 space-y-3 border-l pl-5">{data.application_status_history?.map((event) => <li key={event.id}><p className="font-bold capitalize">{enumLabel(event.to_status)}</p><p className="text-xs text-muted">{format.dateTime(new Date(event.created_at), { dateStyle: "medium", timeStyle: "short" })}</p></li>)}</ol>
    </Card>
    {reviewer && data.application_private_notes?.length ? <Card tone="warm"><h2 className="display text-2xl">{t("privateNotes")}</h2>{data.application_private_notes.map((privateNote) => <div className="mt-3" key={privateNote.id}><p className="text-xs font-bold uppercase">{privateNote.kind}</p><p>{privateNote.note}</p></div>)}</Card> : null}
    {visibleTransitions.length ? <Card><h2 className="display text-2xl">{t("availableActions")}</h2>{reviewer ? <textarea className="mt-4 min-h-24 w-full rounded-xl border p-3" placeholder={t("privateNotePlaceholder")} value={note} onChange={(event) => setNote(event.target.value)} /> : null}<div className="mt-4 flex flex-wrap gap-3">{visibleTransitions.map((status) => <Button key={status} variant={status === "rejected" || status === "returned" ? "danger" : "primary"} onClick={() => void transition(status)}>{enumLabel(status)}</Button>)}</div></Card> : null}
    {data.adoption_followups?.length ? <Card tone="mint"><h2 className="display text-2xl">{t("followups")}</h2>{data.adoption_followups.map((followup) => <div className="mt-5 border-t pt-4" key={followup.id}><p>{t("dayDue", { day: followup.day_offset, date: format.dateTime(new Date(followup.due_at), { dateStyle: "medium" }), outcome: enumLabel(followup.outcome ?? (followup.submitted_at ? "awaiting_review" : "awaiting_submission")) })}</p>{!reviewer && !followup.submitted_at && new Date(followup.due_at) <= new Date() ? <div><textarea className="mt-3 min-h-20 w-full rounded-xl border p-3" placeholder={t("howGoing")} value={followupText} onChange={(event) => setFollowupText(event.target.value)} /><Button className="mt-2" disabled={!followupText.trim()} onClick={() => void mutateFollowup(followup.id, { action: "submit", response: { summary: followupText } })}>{t("submitCheckin")}</Button></div> : null}{reviewer && followup.submitted_at && !followup.outcome ? <div className="mt-3 flex flex-wrap gap-2">{["stable", "needs_support", "returned"].map((outcome) => <Button key={outcome} size="sm" variant={outcome === "returned" ? "danger" : "secondary"} onClick={() => void mutateFollowup(followup.id, { action: "review", outcome, note: note || undefined })}>{enumLabel(outcome)}</Button>)}</div> : null}</div>)}</Card> : null}
  </div>;
}
