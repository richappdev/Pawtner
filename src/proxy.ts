import { NextResponse, type NextRequest } from "next/server";

import { isBlockedStagingApiRequest } from "@/lib/hosting";
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

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
