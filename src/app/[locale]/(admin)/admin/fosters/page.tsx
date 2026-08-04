import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FosterReviewQueue } from "@/components/adoption/foster-review-queue";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getFlag } from "@/lib/feature-flags";

export default async function AdminFostersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!getFlag("closed_pilot_adoption_operations")) notFound();
  const { status = "" } = await searchParams;
  const [t, actions, enums, navigation, titles] = await Promise.all([
    getTranslations("Admin.fosters"), getTranslations("Actions"), getTranslations("Enums"),
    getTranslations("Navigation"), getTranslations("Admin.titles"),
  ]);
  const statuses = ["submitted", "under_review", "need_info", "approved", "rejected", "suspended"] as const;
  const endpoint = `/api/admin/fosters?limit=20${status ? `&status=${encodeURIComponent(status)}` : ""}`;
  return <PageShell eyebrow={navigation("operations")} title={titles("fosterQueue")} description={t("description")} width="xl" role="admin">
    <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
      <label className="grid gap-1 text-sm font-bold">{t("status")}<select className="rounded-xl border px-3 py-2 font-normal" name="status" defaultValue={status}><option value="">{t("allStatuses")}</option>{statuses.map((value) => <option key={value} value={value}>{enums(value)}</option>)}</select></label>
      <Button type="submit" variant="secondary">{actions("applyFilter")}</Button>
    </form>
    <FosterReviewQueue endpoint={endpoint} />
  </PageShell>;
}
