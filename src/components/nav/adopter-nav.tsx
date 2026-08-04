"use client";

import { clsx } from "clsx";
import { Link, usePathname } from "@/i18n/navigation";
import { NotificationBadge } from "@/components/nav/notification-badge";
import { useTranslations } from "next-intl";

const items = [
  ["explore", "/explore", "⌕"],
  ["recommend", "/recommend", "✦"],
  ["favorites", "/favorites", "♡"],
  ["applications", "/applications", "▤"],
  ["me", "/me", "○"],
] as const;

export function AdopterNav({
  showAdminPetsShortcut = false,
}: {
  showAdminPetsShortcut?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");

  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b bg-paper/95 backdrop-blur md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-7 py-3">
          <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
          <nav aria-label={t("adopterAria")} className="flex items-center gap-1">
            {items.map(([key, href]) => {
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
                  {t(key)}{href === "/me" ? <NotificationBadge /> : null}
                </Link>
              );
            })}
            {showAdminPetsShortcut ? (
              <Link href="/admin" className="ml-2 min-h-11 rounded-xl border px-4 py-3 text-sm font-bold text-accent">
                {t("admin")}
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <nav aria-label={t("adopterAria")} className="fixed inset-x-0 bottom-0 z-30 border-t bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {showAdminPetsShortcut ? (
          <Link
            href="/admin"
            aria-label={t("admin")}
            className="absolute -top-14 right-4 inline-flex h-12 items-center rounded-full bg-accent px-4 text-sm font-bold text-white shadow-lg"
          >
            {t("admin")}
          </Link>
        ) : null}
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {items.map(([key, href, icon]) => {
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
                <span>{t(key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
