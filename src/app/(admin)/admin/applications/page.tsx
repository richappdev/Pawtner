import { notFound } from "next/navigation";

import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getFlag } from "@/lib/feature-flags";

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!getFlag("closed_pilot_adoption_operations")) notFound();
  const { status = "" } = await searchParams;
  const endpoint = `/api/admin/applications?limit=20${status ? `&status=${encodeURIComponent(status)}` : ""}`;
  return <PageShell eyebrow="OPERATIONS" title="Application queue" description="Paginated staff oversight for adoption applications and interventions." width="xl" role="admin">
    <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
      <label className="grid gap-1 text-sm font-bold">Status<select className="rounded-xl border px-3 py-2 font-normal" name="status" defaultValue={status}><option value="">All statuses</option>{["submitted", "screening", "interview", "home_check", "trial", "approved", "adopted", "rejected", "withdrawn", "returned"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <Button type="submit" variant="secondary">Apply filter</Button>
    </form>
    <ApplicationWorkbench endpoint={endpoint} basePath="/admin/applications" reviewer />
  </PageShell>;
}
