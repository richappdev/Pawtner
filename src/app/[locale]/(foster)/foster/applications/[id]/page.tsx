import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { getFlag } from "@/lib/feature-flags";
export default async function FosterApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) { if (!getFlag("closed_pilot_adoption_operations")) notFound(); const { id } = await params; const t = await getTranslations("Foster"); return <PageShell eyebrow={t("applicationReviewEyebrow")} title={t("applicationReviewTitle")} width="lg" role="foster" breadcrumbs={[{ href: "/foster/applications", label: t("applications") }]}><ApplicationWorkbench endpoint="/api/foster/applications" basePath="/foster/applications" detailId={id} reviewer /></PageShell>; }
