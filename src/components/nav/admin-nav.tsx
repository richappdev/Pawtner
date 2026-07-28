"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["總覽", "Dashboard", "/admin"],
  ["使用者", "Users", "/admin/users"],
  ["中途", "Fosters", "/admin/fosters"],
  ["毛孩", "Pets", "/admin/pets"],
  ["申請", "Applications", "/admin/applications"],
  ["訂單", "Orders", "/admin/orders"],
  ["回報", "Reports", "/admin/reports"],
  ["AI 審核", "AI", "/admin/ai"],
  ["設定", "Settings", "/admin/settings"],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="border-b bg-surface-soft md:min-h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex gap-2 overflow-x-auto px-5 py-4 md:flex-col md:p-5">
        <Link href="/" className="latin-display mr-4 shrink-0 text-xl font-semibold md:mb-1">Pawtner</Link>
        <p className="hidden text-xs font-bold tracking-widest text-muted uppercase md:mb-5 md:block">Operations</p>
        {items.map(([label, english, href]) => {
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
              {label}<span className="sr-only"> {english}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
