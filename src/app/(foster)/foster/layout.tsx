import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
    return <main className="mx-auto flex min-h-screen max-w-xl items-center px-6"><Card tone="mint"><p className="eyebrow">FOSTER ONBOARDING</p><h1 className="display mt-2 text-4xl">Workspace access pending</h1><p className="mt-4 text-muted">Current status: <strong>{foster?.status?.replaceAll("_", " ") ?? "profile required"}</strong></p>{foster?.verification_notes ? <p className="mt-3">{foster.verification_notes}</p> : null}</Card></main>;
  }
  return <div className="min-h-screen lg:flex"><FosterNav /><div className="min-w-0 flex-1">{children}</div></div>;
}
