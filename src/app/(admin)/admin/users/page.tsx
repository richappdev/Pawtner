import { PilotInvitationForm } from "@/components/admin/pilot-invitation-form";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const [t, navigation, enumTranslations, format] = await Promise.all([getTranslations("Admin"), getTranslations("Navigation"), getTranslations("Enums"), getFormatter()]);
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
        <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">{navigation("operations")}</p>
        <h1 className="display mt-2 text-4xl">{t("titles.users")}</h1>
        <p className="mt-3 text-sm text-muted">{t("usersDescription")}</p>
      </div>
      <Card>
        <h2 className="font-semibold">{t("createInvitation")}</h2>
        <div className="mt-4"><PilotInvitationForm /></div>
      </Card>
      <Card>
        <h2 className="font-semibold">{t("participants")}</h2>
        <ul className="mt-4 divide-y">
          {(users ?? []).map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{user.display_name ?? user.email ?? user.id}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(user.user_roles ?? []).map((item) => <Badge key={item.role}>{enumTranslations(item.role as "admin")}</Badge>)}
                {user.suspended_at ? <Badge variant="danger">{t("suspended")}</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="font-semibold">{t("invitationRecords")}</h2>
        <ul className="mt-4 divide-y">
          {(invitations ?? []).map((invite) => (
            <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{invite.email}</p>
                <p className="text-xs text-muted">{t("expiresAt", { date: format.dateTime(new Date(invite.expires_at), { dateStyle: "medium", timeStyle: "short" }) })}</p>
              </div>
              <Badge>{enumTranslations((invite.revoked_at ? "revoked" : invite.accepted_at ? "accepted" : invite.intended_role) as "accepted")}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
