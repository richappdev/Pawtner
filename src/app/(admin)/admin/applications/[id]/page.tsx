import { notFound } from "next/navigation";
import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { getFlag } from "@/lib/feature-flags";
export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) { if (!getFlag("closed_pilot_adoption_operations")) notFound(); const { id } = await params; return <PageShell eyebrow="OPERATIONS" title="Application intervention" width="lg" role="admin" breadcrumbs={[{ href: "/admin/applications", label: "Applications" }]}><ApplicationWorkbench endpoint="/api/admin/applications" basePath="/admin/applications" detailId={id} reviewer /></PageShell>; }
