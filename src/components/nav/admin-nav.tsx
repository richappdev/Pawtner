"use client";

import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["dashboard", "/admin"],
  ["users", "/admin/users"],
  ["fosters", "/admin/fosters"],
  ["pets", "/admin/pets"],
  ["applications", "/admin/applications"],
  ["orders", "/admin/orders"],
  ["reports", "/admin/reports"],
  ["ai", "/admin/ai"],
  ["settings", "/admin/settings"],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  return (
    <aside className="border-b bg-surface-soft md:min-h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex gap-2 overflow-x-auto px-5 py-4 md:flex-col md:p-5">
        <Link href="/" className="latin-display mr-4 shrink-0 text-xl font-semibold md:mb-1">Pawtner</Link>
        <p className="hidden text-xs font-bold tracking-widest text-muted uppercase md:mb-5 md:block">{t("operations")}</p>
        {items.map(([key, href]) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-bold",
                active ? "bg-surface text-ink shadow-sm" : "text-muted hover:bg-mint hover:text-accent",
              )}
            >
              {t(key)}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
