"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("Common");

  async function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    }).catch(() => undefined);
    const query = searchParams.toString();
    const hash = window.location.hash;
    router.replace(`${pathname}${query ? `?${query}` : ""}${hash}`, { locale: nextLocale });
  }

  return (
    <div
      aria-label={t("language")}
      className="fixed right-3 top-3 z-50 flex rounded-full border bg-surface/95 p-1 text-xs font-bold shadow-sm backdrop-blur"
    >
      <button
        type="button"
        aria-label={t("traditionalChinese")}
        aria-pressed={locale === "zh-TW"}
        onClick={() => void switchLocale("zh-TW")}
        className={`min-h-11 rounded-full px-3 py-2 ${locale === "zh-TW" ? "bg-accent text-white" : "text-muted"}`}
      >
        {t("zhShort")}
      </button>
      <button
        type="button"
        aria-label={t("english")}
        aria-pressed={locale === "en"}
        onClick={() => void switchLocale("en")}
        className={`min-h-11 rounded-full px-3 py-2 ${locale === "en" ? "bg-accent text-white" : "text-muted"}`}
      >
        {t("enShort")}
      </button>
    </div>
  );
}
