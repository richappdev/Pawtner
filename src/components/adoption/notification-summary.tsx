"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/card";

export function NotificationSummary() {
  const [data, setData] = useState<{ unreadCount: number; items: Array<{ id: string; title: string; body: string; href: string | null }> } | null>(null);
  useEffect(() => { void fetch("/api/notifications?unread=true", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => setData(payload?.data ?? { unreadCount: 0, items: [] })); }, []);
  return <Card tone="mint" className="mt-8"><div className="flex items-center justify-between"><h2 className="display text-2xl">Notifications</h2><span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-white">{data?.unreadCount ?? "…"} unread</span></div>
    <div className="mt-4 space-y-3">{data?.items.slice(0, 3).map((item) => <div key={item.id}><p className="font-bold">{item.title}</p><p className="text-sm text-muted">{item.body}</p>{item.href ? <Link className="text-sm font-bold text-accent" href={item.href}>Open</Link> : null}</div>)}{data && !data.items.length ? <p className="text-sm text-muted">You are all caught up.</p> : null}</div></Card>;
}
