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

export function AdopterNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="領養者導覽" className="fixed inset-x-0 bottom-0 z-20 border-t bg-[#fafaf7]/95 backdrop-blur">
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
