import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FosterReviewQueue } from "@/components/adoption/foster-review-queue";
import { PageShell } from "@/components/page-shell";
import { getFlag } from "@/lib/feature-flags";
export default async function AdminFosterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!getFlag("closed_pilot_adoption_operations")) notFound();
  const { id } = await params;
  const [navigation, titles] = await Promise.all([
    getTranslations("Navigation"), getTranslations("Admin.titles"),
  ]);
  return <PageShell eyebrow={navigation("operations")} title={titles("fosterReview")} width="lg" role="admin" breadcrumbs={[{ href: "/admin/fosters", label: navigation("fosters") }]}><FosterReviewQueue detailId={id} /></PageShell>;
}
