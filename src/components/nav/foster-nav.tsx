"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["今日總覽", "/foster", "⌂"],
  ["毛孩資料", "/foster/pets", "○"],
  ["領養申請", "/foster/applications", "▤"],
  ["訊息", "/foster/messages", "◇"],
  ["照護物資", "/foster/materials", "□"],
  ["設定", "/foster/more", "⋯"],
] as const;

export function FosterNav() {
  const pathname = usePathname();
  return (
    <aside className="border-b bg-surface lg:min-h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-5 py-4 lg:block lg:p-6">
        <Link href="/" className="latin-display shrink-0 text-2xl font-semibold">Pawtner</Link>
        <p className="hidden text-xs font-bold tracking-widest text-muted uppercase lg:mt-2 lg:block">Foster workspace</p>
        <nav aria-label="中途工作區導覽" className="ml-auto flex gap-1 overflow-x-auto lg:ml-0 lg:mt-8 lg:flex-col">
          {items.map(([label, href, icon]) => {
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
                <span aria-hidden="true">{icon}</span>{label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
