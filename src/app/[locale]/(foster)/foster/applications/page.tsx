import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getFlag } from "@/lib/feature-flags";

export default async function FosterApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string; petId?: string }> }) {
  if (!getFlag("closed_pilot_adoption_operations")) notFound();
  const { status = "", petId = "" } = await searchParams;
  const [t, adminApplications, enums] = await Promise.all([
    getTranslations("Foster"), getTranslations("Admin.applications"), getTranslations("Enums"),
  ]);
  const statuses = ["submitted", "screening", "interview", "home_check", "trial", "approved", "adopted", "rejected", "withdrawn", "returned"] as const;
  const query = new URLSearchParams({ limit: "20" });
  if (status) query.set("status", status);
  if (petId) query.set("petId", petId);
  return <PageShell eyebrow={t("applicationsEyebrow")} title={t("applicationsTitle")} description={t("applicationsDescription")} width="lg" role="foster">
    <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
      <label className="grid gap-1 text-sm font-bold">{adminApplications("status")}<select className="rounded-xl border px-3 py-2 font-normal" name="status" defaultValue={status}><option value="">{adminApplications("allStatuses")}</option>{statuses.map((value) => <option key={value} value={value}>{enums(value)}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-bold">{t("petId")}<input className="rounded-xl border px-3 py-2 font-normal" name="petId" defaultValue={petId} /></label>
      <Button type="submit" variant="secondary">{t("applyFilters")}</Button>
    </form>
    <ApplicationWorkbench endpoint={`/api/foster/applications?${query.toString()}`} basePath="/foster/applications" reviewer />
  </PageShell>;
}
