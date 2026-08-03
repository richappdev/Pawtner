"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBadge } from "@/components/nav/notification-badge";

const items = [
  ["探索", "Explore", "/explore", "⌕"],
  ["推薦", "Recommend", "/recommend", "✦"],
  ["收藏", "Favorites", "/favorites", "♡"],
  ["申請", "Applications", "/applications", "▤"],
  ["我的", "Me", "/me", "○"],
] as const;

export function AdopterNav({
  showAdminPetsShortcut = false,
}: {
  showAdminPetsShortcut?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b bg-paper/95 backdrop-blur md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-7 py-3">
          <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
          <nav aria-label="領養者導覽" className="flex items-center gap-1">
            {items.map(([label, english, href]) => {
              const active = pathname === href || (href === "/explore" && pathname.startsWith("/pets/"));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "min-h-11 rounded-xl px-4 py-3 text-sm font-bold transition",
                    active ? "bg-mint text-accent" : "text-muted hover:bg-surface hover:text-ink",
                  )}
                >
                  {label}{href === "/me" ? <NotificationBadge /> : null}<span className="sr-only"> {english}</span>
                </Link>
              );
            })}
            {showAdminPetsShortcut ? (
              <Link href="/admin" className="ml-2 min-h-11 rounded-xl border px-4 py-3 text-sm font-bold text-accent">
                管理後台
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <nav aria-label="領養者導覽" className="fixed inset-x-0 bottom-0 z-30 border-t bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {showAdminPetsShortcut ? (
          <Link
            href="/admin"
            aria-label="管理後台"
            className="absolute -top-14 right-4 inline-flex h-12 items-center rounded-full bg-accent px-4 text-sm font-bold text-white shadow-lg"
          >
            管理後台
          </Link>
        ) : null}
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {items.map(([label, english, href, icon]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs",
                  active ? "font-bold text-accent" : "text-muted",
                )}
              >
                <span className="text-lg leading-none" aria-hidden="true">{icon}</span>
                <span>{label}</span>
                <span className="sr-only">{english}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
