import { createClient } from "@/lib/supabase/server";
import { resolveAppUser } from "@/lib/auth/resolve-user";
import type { PermissionActor } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types/roles";

export async function getSessionActor(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  actor: PermissionActor;
  user: { id: string; email?: string | null };
} | null> {
  const appUser = await resolveAppUser();
  if (!appUser) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", appUser.id);

  return {
    supabase,
    user: { id: appUser.id, email: appUser.email },
    actor: {
      id: appUser.id,
      roles: (data ?? []).map((row) => row.role as AppRole),
    },
  };
}
