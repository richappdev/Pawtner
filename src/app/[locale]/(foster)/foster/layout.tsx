import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FosterNav } from "@/components/nav/foster-nav";
import { Card } from "@/components/ui/card";
import { getSessionActor } from "@/lib/auth/session-actor";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default async function FosterLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionActor();
  if (!session) redirect("/login");
  const { data: foster } = await session.supabase.from("foster_profiles")
    .select("status,verification_notes").eq("user_id", session.actor.id).maybeSingle();
  if (!foster || foster.status !== "approved" || !session.actor.roles.includes("foster")) {
    const [t, enums] = await Promise.all([getTranslations("Foster"), getTranslations("Enums")]);
    const status = foster?.status ? enums(foster.status as "submitted") : t("profileRequired");
    return <main className="mx-auto flex min-h-screen max-w-xl items-center px-6"><Card tone="mint"><p className="eyebrow">{t("onboarding")}</p><h1 className="display mt-2 text-4xl">{t("accessPending")}</h1><p className="mt-4 text-muted">{t("currentStatus", { status })}</p>{foster?.verification_notes ? <p className="mt-3">{foster.verification_notes}</p> : null}</Card></main>;
  }
  return <div className="min-h-screen lg:flex"><FosterNav /><div className="min-w-0 flex-1">{children}</div></div>;
}
