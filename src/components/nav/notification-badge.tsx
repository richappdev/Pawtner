"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
export function NotificationBadge() { const [count, setCount] = useState(0); const t = useTranslations("Navigation"); useEffect(() => { void fetch("/api/notifications?unread=true", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => setCount(payload?.data?.unreadCount ?? 0)); }, []); return count ? <span aria-label={t("unreadNotifications", { count })} className="ml-1 rounded-full bg-clay px-2 py-0.5 text-xs text-white">{count > 99 ? "99+" : count}</span> : null; }
