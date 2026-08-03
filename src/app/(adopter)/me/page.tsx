import { notFound, redirect } from "next/navigation";

import { NotificationSummary } from "@/components/adoption/notification-summary";
import { QuestionnaireEditor } from "@/components/adoption/questionnaire-editor";
import { LogoutButton } from "@/components/logout-button";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
import { noIndexRobots, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "My Pawtner", description: "Manage your adoption profile and matching questionnaire.", path: "/me", robots: noIndexRobots });

export default async function MePage() {
  if (!await getSessionActor()) redirect("/login");
  if (!getFlag("closed_pilot_adoption_operations")) notFound();
  return <PageShell eyebrow="MY PAWTNER" title="Your adoption profile" description="Keep your household and care capacity current. Pawtner only evaluates structured facts you confirm." width="lg" headerAction={<LogoutButton />}><QuestionnaireEditor /><NotificationSummary /></PageShell>;
}
