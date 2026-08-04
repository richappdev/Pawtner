import { NextResponse, type NextRequest } from "next/server";

import { isBlockedStagingApiRequest } from "@/lib/hosting";
import {
  LOCALE_COOKIE,
  isAppLocale,
  localizePathname,
  resolveRequestLocale,
} from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (
    isBlockedStagingApiRequest(
      process.env.PAWTNER_ENV,
      request.nextUrl.pathname,
    )
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return updateSession(request);
  }

  const firstSegment = request.nextUrl.pathname.split("/")[1];
  if (isAppLocale(firstSegment)) {
    const headers = new Headers(request.headers);
    headers.set("x-next-intl-locale", firstSegment);
    const response = NextResponse.next({ request: { headers } });
    response.cookies.set(LOCALE_COOKIE, firstSegment, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return updateSession(request, response);
  }

  const locale = resolveRequestLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );
  const destination = request.nextUrl.clone();
  destination.pathname = localizePathname(destination.pathname, locale);
  const response = NextResponse.redirect(destination);
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return updateSession(request, response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
