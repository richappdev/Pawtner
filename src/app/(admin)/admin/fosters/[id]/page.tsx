import { notFound } from "next/navigation";
import { FosterReviewQueue } from "@/components/adoption/foster-review-queue";
import { PageShell } from "@/components/page-shell";
import { getFlag } from "@/lib/feature-flags";
export default async function AdminFosterDetailPage({ params }: { params: Promise<{ id: string }> }) { if (!getFlag("closed_pilot_adoption_operations")) notFound(); const { id } = await params; return <PageShell eyebrow="OPERATIONS" title="Foster review" width="lg" role="admin" breadcrumbs={[{ href: "/admin/fosters", label: "Fosters" }]}><FosterReviewQueue detailId={id} /></PageShell>; }
