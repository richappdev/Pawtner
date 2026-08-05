"use client";

import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBadge } from "@/components/nav/notification-badge";

const items = [
  ["today", "/foster", "⌂"],
  ["pets", "/foster/pets", "○"],
  ["applications", "/foster/applications", "▤"],
  ["messages", "/foster/messages", "◇"],
  ["materials", "/foster/materials", "□"],
  ["settings", "/foster/more", "⋯"],
] as const;

export function FosterNav() {
  const pathname = usePathname();
  const t = useTranslations("Foster");
  return (
    <aside className="border-b bg-surface lg:min-h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-5 py-4 lg:block lg:p-6">
        <Link href="/" className="latin-display shrink-0 text-2xl font-semibold">Pawtner</Link>
        <p className="hidden text-xs font-bold tracking-widest text-muted uppercase lg:mt-2 lg:block">{t("workspace")}</p>
        <nav aria-label={t("navAria")} className="ml-auto flex gap-1 overflow-x-auto lg:ml-0 lg:mt-8 lg:flex-col">
          {items.map(([key, href, icon]) => {
            const active = href === "/foster" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold",
                  active ? "bg-mint text-accent" : "text-muted hover:bg-surface-soft hover:text-ink",
                )}
              >
                <span aria-hidden="true">{icon}</span>{t(key)}{href === "/foster" ? <NotificationBadge /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
