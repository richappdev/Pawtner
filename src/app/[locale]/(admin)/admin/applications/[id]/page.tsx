import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { getFlag } from "@/lib/feature-flags";
export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!getFlag("closed_pilot_adoption_operations")) notFound();
  const { id } = await params;
  const [navigation, titles] = await Promise.all([
    getTranslations("Navigation"), getTranslations("Admin.titles"),
  ]);
  return <PageShell eyebrow={navigation("operations")} title={titles("applicationIntervention")} width="lg" role="admin" breadcrumbs={[{ href: "/admin/applications", label: navigation("applications") }]}><ApplicationWorkbench endpoint="/api/admin/applications" basePath="/admin/applications" detailId={id} reviewer /></PageShell>;
}
