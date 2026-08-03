import { notFound } from "next/navigation";

import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getFlag } from "@/lib/feature-flags";

export default async function FosterApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string; petId?: string }> }) {
  if (!getFlag("closed_pilot_adoption_operations")) notFound();
  const { status = "", petId = "" } = await searchParams;
  const query = new URLSearchParams({ limit: "20" });
  if (status) query.set("status", status);
  if (petId) query.set("petId", petId);
  return <PageShell eyebrow="APPLICATIONS" title="Adoption review queue" description="Review applications for your pets, record private operational notes, and manage follow-ups." width="lg" role="foster">
    <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
      <label className="grid gap-1 text-sm font-bold">Status<select className="rounded-xl border px-3 py-2 font-normal" name="status" defaultValue={status}><option value="">All statuses</option>{["submitted", "screening", "interview", "home_check", "trial", "approved", "adopted", "rejected", "withdrawn", "returned"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-bold">Pet ID<input className="rounded-xl border px-3 py-2 font-normal" name="petId" defaultValue={petId} /></label>
      <Button type="submit" variant="secondary">Apply filters</Button>
    </form>
    <ApplicationWorkbench endpoint={`/api/foster/applications?${query.toString()}`} basePath="/foster/applications" reviewer />
  </PageShell>;
}
