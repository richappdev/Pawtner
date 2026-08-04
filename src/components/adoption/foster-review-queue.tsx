"use client";

import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Foster = { id: string; display_name: string; status: string; region: string | null; submitted_at: string | null; verification_notes?: string | null };

export function FosterReviewQueue({ detailId, endpoint = "/api/admin/fosters" }: { detailId?: string; endpoint?: string }) {
  const t = useTranslations("Admin.fosters"); const actions = useTranslations("Actions"); const enumTranslations = useTranslations("Enums") as unknown as (key: string) => string;
  const [items, setItems] = useState<Foster[]>([]); const [detail, setDetail] = useState<Foster | null>(null); const [cursor, setCursor] = useState<string | null>(null); const [state, setState] = useState<"loading"|"ready"|"error"|"conflict">("loading"); const [message, setMessage] = useState(""); const [note, setNote] = useState("");
  const load = useCallback(async (next?: string) => { try { const listUrl = next ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(next)}` : endpoint; const response = await fetch(detailId ? `/api/admin/fosters/${detailId}` : listUrl, { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message ?? t("unableMessage")); if (detailId) setDetail(payload.data); else { setItems((current) => next ? [...current, ...(payload.data.items ?? [])] : payload.data.items ?? []); setCursor(payload.data.nextCursor ?? null); } setState("ready"); } catch (error) { setMessage(error instanceof Error ? error.message : t("unableMessage")); setState("error"); } }, [detailId, endpoint, t]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function review(status: string) { const response = await fetch(`/api/admin/fosters/${detailId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, note }) }); const payload = await response.json(); if (!response.ok) { setMessage(payload.error?.message ?? t("reviewFailed")); setState(response.status === 409 ? "conflict" : "error"); return; } setNote(""); await load(); }
  if (state === "loading") return <Card className="mt-8 animate-pulse">{t("loading")}</Card>;
  if (state === "error" && !detail && !items.length) return <Alert title={t("unableToLoad")} tone="danger"><p>{message}</p><Button className="mt-3" onClick={() => { setState("loading"); void load(); }}>{actions("retry")}</Button></Alert>;
  if (!detailId) return items.length ? <div className="mt-8 space-y-4">{items.map((foster) => <Card key={foster.id} interactive><div className="flex items-center justify-between"><div><h2 className="display text-2xl">{foster.display_name}</h2><p className="text-sm text-muted">{foster.region ?? t("regionMissing")}</p></div><Badge>{enumTranslations(foster.status)}</Badge></div><Link className="mt-4 inline-block font-bold text-accent" href={`/admin/fosters/${foster.id}`}>{t("reviewFoster")}</Link></Card>)}{cursor ? <Button variant="secondary" onClick={() => { setState("loading"); void load(cursor); }}>{actions("loadMore")}</Button> : null}</div> : <Card tone="mint" className="mt-8">{t("none")}</Card>;
  if (!detail) return null;
  return <div className="mt-8 space-y-6">{message ? <Alert title={state === "conflict" ? t("reviewConflict") : t("reviewFailed")} tone="danger">{message}</Alert> : null}<Card><div className="flex justify-between"><h2 className="display text-2xl">{detail.display_name}</h2><Badge>{enumTranslations(detail.status)}</Badge></div><p className="mt-3 text-muted">{detail.region ?? t("noRegion")}</p><p className="mt-3">{detail.verification_notes ?? t("noPreviousNote")}</p></Card><Card tone="warm"><h2 className="display text-2xl">{t("recordReview")}</h2><textarea className="mt-4 min-h-28 w-full rounded-xl border p-3" required placeholder={t("notePlaceholder")} value={note} onChange={(event) => setNote(event.target.value)} /><div className="mt-4 flex flex-wrap gap-3">{["under_review","need_info","approved","rejected","suspended"].map((status) => <Button key={status} disabled={!note.trim()} variant={status === "rejected" || status === "suspended" ? "danger" : "primary"} onClick={() => void review(status)}>{enumTranslations(status)}</Button>)}</div></Card></div>;
}
