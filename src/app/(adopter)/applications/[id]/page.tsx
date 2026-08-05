import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) { if (!await getSessionActor()) redirect("/login"); if (!getFlag("closed_pilot_adoption_operations")) notFound(); const { id } = await params; const t = await getTranslations("Adopter"); return <PageShell eyebrow={t("applicationDetailEyebrow")} title={t("applicationTimeline")} width="lg" breadcrumbs={[{ href: "/applications", label: t("applicationsEyebrow") }]}><ApplicationWorkbench endpoint="/api/applications" basePath="/applications" detailId={id} /></PageShell>; }
