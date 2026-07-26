import { z } from "zod";

import { jsonError, jsonOk, requireUser } from "@/lib/api/http";
import { createServiceClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/roles";

export { jsonError, jsonOk, requireUser };

export async function serviceClient() {
  try {
    return { supabase: createServiceClient() } as const;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing required environment variable:")) {
      return { response: jsonError("Service unavailable: Supabase environment is not configured.", 503) } as const;
    }
    return { response: jsonError("Unable to initialize Supabase.", 503) } as const;
  }
}

export async function requireActor(request?: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth;
  const userId = auth.appUser?.id ?? auth.user.id;
  const { data } = await auth.supabase.from("user_roles").select("role").eq("user_id", userId);
  return {
    ...auth,
    user: { ...auth.user, id: userId },
    actor: { id: userId, roles: (data ?? []).map((row) => row.role) as AppRole[] },
  } as const;
}

export async function parseJson<T extends z.ZodType>(request: Request, schema: T) {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success
      ? { data: parsed.data }
      : { response: jsonError("Invalid request body.", 422, parsed.error.flatten()) };
  } catch {
    return { response: jsonError("Request body must be valid JSON.", 400) };
  }
}

export const idSchema = z.string().uuid();

export function dbError(error: { message: string } | null) {
  return error ? jsonError(error.message, 500) : null;
}
