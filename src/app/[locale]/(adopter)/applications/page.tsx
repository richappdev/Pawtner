import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
import { noIndexRobots, localizedPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";
export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) { return localizedPageMetadata((await params).locale, "applicationsTitle", "/applications", { descriptionKey: "applicationsDescription", robots: noIndexRobots }); }
export default async function ApplicationsPage() { if (!await getSessionActor()) redirect("/login"); if (!getFlag("closed_pilot_adoption_operations")) notFound(); const t = await getTranslations("Adopter"); return <PageShell eyebrow={t("applicationsEyebrow")} title={t("applicationsTitle")} description={t("applicationsDescription")} width="lg"><ApplicationWorkbench endpoint="/api/applications" basePath="/applications" /></PageShell>; }
