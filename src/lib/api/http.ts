import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export function jsonOk<T>(data: T, init: ResponseInit = {}) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: { message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export async function requireUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { response: jsonError("Authentication is required.", 401) } as const;
    }
    return { supabase, user } as const;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required environment variable:")) {
      return { response: jsonError("Service unavailable: Supabase environment is not configured.", 503) } as const;
    }
    return { response: jsonError("Unable to initialize authentication.", 503) } as const;
  }
}
