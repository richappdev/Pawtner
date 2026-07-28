import { PilotInvitationForm } from "@/components/admin/pilot-invitation-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const [{ data: users }, { data: invitations }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id,email,display_name,profile_completed_at,suspended_at,user_roles(role)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("pilot_invitations")
      .select("id,email,intended_role,expires_at,accepted_at,revoked_at,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <main className="w-full space-y-8 p-6 md:p-10">
      <div>
        <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">Operations</p>
        <h1 className="display mt-2 text-4xl">Pilot users</h1>
        <p className="mt-3 text-sm text-muted">邀請制封閉測試；角色升級需另外審核。</p>
      </div>
      <Card>
        <h2 className="font-semibold">建立邀請</h2>
        <div className="mt-4"><PilotInvitationForm /></div>
      </Card>
      <Card>
        <h2 className="font-semibold">參與者</h2>
        <ul className="mt-4 divide-y">
          {(users ?? []).map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{user.display_name ?? user.email ?? user.id}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(user.user_roles ?? []).map((item) => <Badge key={item.role}>{item.role}</Badge>)}
                {user.suspended_at ? <Badge variant="danger">已停權</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="font-semibold">邀請紀錄</h2>
        <ul className="mt-4 divide-y">
          {(invitations ?? []).map((invite) => (
            <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{invite.email}</p>
                <p className="text-xs text-muted">到期：{new Date(invite.expires_at).toLocaleString("zh-TW")}</p>
              </div>
              <Badge>{invite.revoked_at ? "revoked" : invite.accepted_at ? "accepted" : invite.intended_role}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
