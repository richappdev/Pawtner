"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { Card } from "@/components/ui/card";

export function NotificationSummary() {
  const t = useTranslations("Adopter"); const actions = useTranslations("Actions");
  const [data, setData] = useState<{ unreadCount: number; items: Array<{ id: string; title: string; body: string; href: string | null }> } | null>(null);
  useEffect(() => { void fetch("/api/notifications?unread=true", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => setData(payload?.data ?? { unreadCount: 0, items: [] })); }, []);
  return <Card tone="mint" className="mt-8"><div className="flex items-center justify-between"><h2 className="display text-2xl">{t("notifications")}</h2><span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-white">{t("unread", { count: data?.unreadCount ?? "…" })}</span></div>
    <div className="mt-4 space-y-3">{data?.items.slice(0, 3).map((item) => <div key={item.id}><p className="font-bold">{item.title}</p><p className="text-sm text-muted">{item.body}</p>{item.href ? <Link className="text-sm font-bold text-accent" href={item.href}>{actions("open")}</Link> : null}</div>)}{data && !data.items.length ? <p className="text-sm text-muted">{t("caughtUp")}</p> : null}</div></Card>;
}
