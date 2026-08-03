import { NextResponse, type NextRequest } from "next/server";

import { isBlockedDirectCloudRunRequest } from "@/lib/hosting";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (
    isBlockedDirectCloudRunRequest(
      process.env.PAWTNER_ENV,
      request.headers.get("host") ?? request.nextUrl.hostname,
    )
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
