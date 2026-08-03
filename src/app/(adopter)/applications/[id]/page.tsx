import { notFound, redirect } from "next/navigation";
import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) { if (!await getSessionActor()) redirect("/login"); if (!getFlag("closed_pilot_adoption_operations")) notFound(); const { id } = await params; return <PageShell eyebrow="APPLICATION DETAIL" title="Application timeline" width="lg" breadcrumbs={[{ href: "/applications", label: "Applications" }]}><ApplicationWorkbench endpoint="/api/applications" basePath="/applications" detailId={id} /></PageShell>; }
