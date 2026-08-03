import { notFound } from "next/navigation";
import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { getFlag } from "@/lib/feature-flags";
export default async function FosterApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) { if (!getFlag("closed_pilot_adoption_operations")) notFound(); const { id } = await params; return <PageShell eyebrow="FOSTER REVIEW" title="Application review" width="lg" role="foster" breadcrumbs={[{ href: "/foster/applications", label: "Applications" }]}><ApplicationWorkbench endpoint="/api/foster/applications" basePath="/foster/applications" detailId={id} reviewer /></PageShell>; }
