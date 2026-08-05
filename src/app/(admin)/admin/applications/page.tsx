import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getFlag } from "@/lib/feature-flags";

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!getFlag("closed_pilot_adoption_operations")) notFound();
  const { status = "" } = await searchParams;
  const [t, actions, enums] = await Promise.all([
    getTranslations("Admin.applications"),
    getTranslations("Actions"),
    getTranslations("Enums"),
  ]);
  const statuses = ["submitted", "screening", "interview", "home_check", "trial", "approved", "adopted", "rejected", "withdrawn", "returned"] as const;
  const endpoint = `/api/admin/applications?limit=20${status ? `&status=${encodeURIComponent(status)}` : ""}`;
  return <PageShell eyebrow={await getTranslations("Navigation").then((translate) => translate("operations"))} title={await getTranslations("Admin.titles").then((translate) => translate("applicationQueue"))} description={t("description")} width="xl" role="admin">
    <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
      <label className="grid gap-1 text-sm font-bold">{t("status")}<select className="rounded-xl border px-3 py-2 font-normal" name="status" defaultValue={status}><option value="">{t("allStatuses")}</option>{statuses.map((value) => <option key={value} value={value}>{enums(value)}</option>)}</select></label>
      <Button type="submit" variant="secondary">{actions("applyFilter")}</Button>
    </form>
    <ApplicationWorkbench endpoint={endpoint} basePath="/admin/applications" reviewer />
  </PageShell>;
}
