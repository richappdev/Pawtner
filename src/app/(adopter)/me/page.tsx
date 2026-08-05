import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { NotificationSummary } from "@/components/adoption/notification-summary";
import { QuestionnaireEditor } from "@/components/adoption/questionnaire-editor";
import { LogoutButton } from "@/components/logout-button";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
import { noIndexRobots, localizedPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedPageMetadata("meTitle", "/me", { descriptionKey: "meDescription", robots: noIndexRobots }); }

export default async function MePage() {
  if (!await getSessionActor()) redirect("/login");
  if (!getFlag("closed_pilot_adoption_operations")) notFound();
  const t = await getTranslations("Adopter");
  return <PageShell eyebrow={t("meEyebrow")} title={t("meTitle")} description={t("meDescription")} width="lg" headerAction={<LogoutButton />}><QuestionnaireEditor /><NotificationSummary /></PageShell>;
}
