import { defineRouting } from "next-intl/routing";

export const SUPPORTED_LOCALES = ["zh-TW", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "zh-TW";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeCookie: {
    name: LOCALE_COOKIE,
    sameSite: "lax",
  },
  localeDetection: true,
});

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

function localeFromLanguageTag(tag: string): AppLocale | undefined {
  const normalized = tag.trim().toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (
    normalized === "zh-tw" ||
    normalized === "zh-hant" ||
    normalized.startsWith("zh-hant-")
  ) return "zh-TW";
  return undefined;
}

export function resolveRequestLocale(
  cookieLocale?: string,
  acceptLanguage?: string | null,
): AppLocale {
  if (isAppLocale(cookieLocale)) return cookieLocale;

  const candidates = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      return { tag, quality: quality ? Number(quality.slice(2)) : 1 };
    })
    .filter((candidate) => candidate.tag && candidate.quality > 0)
    .sort((left, right) => right.quality - left.quality);

  for (const candidate of candidates) {
    const locale = localeFromLanguageTag(candidate.tag);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname: string): string {
  const match = pathname.match(/^\/(zh-TW|en)(?=\/|$)/);
  if (!match) return pathname || "/";
  const stripped = pathname.slice(match[0].length);
  return stripped ? (stripped.startsWith("/") ? stripped : `/${stripped}`) : "/";
}

export function localizePathname(pathname: string, locale: AppLocale): string {
  const stripped = stripLocalePrefix(pathname);
  return stripped === "/" ? `/${locale}` : `/${locale}${stripped}`;
}
