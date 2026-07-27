"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const items = [
  ["探索", "Explore", "/explore"],
  ["推薦", "Recommend", "/recommend"],
  ["收藏", "Favorites", "/favorites"],
  ["申請", "Applications", "/applications"],
  ["我的", "Me", "/me"],
] as const;

export function AdopterNav({
  showAdminPetsShortcut = false,
}: {
  showAdminPetsShortcut?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="領養者導覽" className="fixed inset-x-0 bottom-0 z-20 border-t bg-[#fafaf7]/95 backdrop-blur">
      {showAdminPetsShortcut ? (
        <div className="pointer-events-none absolute inset-x-0 -top-16">
          <div className="mx-auto flex max-w-lg justify-end px-4">
            <Link
              href="/admin/pets"
              aria-label="進入毛孩管理"
              title="毛孩管理"
              className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-accent text-white shadow-lg transition hover:bg-[#094b41] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                <path
                  d="M12 11.2c2.6 0 4.7 2.4 4.7 4.6 0 1.7-1.5 2.7-4.7 2.7s-4.7-1-4.7-2.7c0-2.2 2.1-4.6 4.7-4.6Z"
                  fill="currentColor"
                />
                <path
                  d="M7.2 7.2c1.1 0 1.9.9 1.9 1.9S8 11 7.2 11 5.3 10.1 5.3 9.1s.8-1.9 1.9-1.9Zm9.6 0c1.1 0 1.9.9 1.9 1.9S18 11 16.8 11s-1.9-.9-1.9-1.9.8-1.9 1.9-1.9ZM5.8 12.4c1.2 0 2.1 1 2.1 2.2s-1 2.1-2.1 2.1-2.2-1-2.2-2.1 1-2.2 2.2-2.2Zm12.4 0c1.2 0 2.2 1 2.2 2.2s-1 2.1-2.2 2.1-2.1-1-2.1-2.1 1-2.2 2.1-2.2Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(([label, english, href]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs",
                active ? "font-bold text-accent" : "text-muted",
              )}
            >
              <span>{label}</span>
              <span className="text-[10px]">{english}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
