import Link from "next/link";

import { AdminPetActions } from "@/components/admin/admin-pet-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PetSourceType, PetSpecies, PetStatus } from "@/lib/schemas/pet";

export interface AdminPetListItem {
  id: string;
  name: string;
  species: PetSpecies;
  source_type: PetSourceType;
  region: string | null;
  status: PetStatus;
  is_published: boolean;
  updated_at: string;
  foster_profiles?: { display_name?: string | null } | null;
  pet_source_records?: Array<{
    shelter_name?: string | null;
    last_seen_at?: string | null;
    availability?: string | null;
  }> | null;
}

const STATUS_OPTIONS: PetStatus[] = [
  "intake", "medical_hold", "available", "application_pending", "reserved",
  "trial_adoption", "adopted", "hidden", "archived",
];

export function AdminPetsTable({
  pets,
  filters,
}: {
  pets: AdminPetListItem[];
  filters: { status?: string; species?: string; source?: string; isPublished?: string; q?: string };
}) {
  return (
    <div className="mt-8 space-y-6">
      <Card className="max-w-5xl">
        <form method="get" className="grid gap-3 md:grid-cols-5">
          <label className="text-sm"><span className="mb-1 block font-semibold">搜尋</span><input name="q" defaultValue={filters.q ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm" /></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">狀態</span><select name="status" defaultValue={filters.status ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option>{STATUS_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">物種</span><select name="species" defaultValue={filters.species ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option><option value="dog">dog</option><option value="cat">cat</option><option value="other">other</option></select></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">來源</span><select name="source" defaultValue={filters.source ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option><option value="private_foster">Pawtner 中途</option><option value="government">政府資料</option></select></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">發布</span><select name="isPublished" defaultValue={filters.isPublished ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option><option value="true">已發布</option><option value="false">未發布</option></select></label>
          <div className="md:col-span-5"><button type="submit" className="min-h-11 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white">套用篩選</button></div>
        </form>
      </Card>

      {pets.length === 0 ? <Card><p>沒有符合條件的動物。</p></Card> : (
        <div className="overflow-x-auto rounded-2xl border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-surface-soft text-xs uppercase tracking-wide text-muted">
              <tr>{["名稱", "來源", "物種", "地區", "狀態", "發布", "照護單位", "更新", "操作"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr>
            </thead>
            <tbody>
              {pets.map((pet) => {
                const sourceRecord = pet.pet_source_records?.[0];
                return (
                  <tr key={pet.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3"><Link href={`/admin/pets/${pet.id}`} className="font-semibold text-accent hover:underline">{pet.name}</Link></td>
                    <td className="px-4 py-3"><Badge variant={pet.source_type === "government" ? "pending" : "neutral"}>{pet.source_type === "government" ? "政府" : "中途"}</Badge></td>
                    <td className="px-4 py-3">{pet.species}</td>
                    <td className="px-4 py-3">{pet.region ?? "—"}</td>
                    <td className="px-4 py-3"><Badge>{sourceRecord?.availability ?? pet.status}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={pet.is_published ? "success" : "pending"}>{pet.is_published ? "published" : "draft"}</Badge></td>
                    <td className="px-4 py-3">{sourceRecord?.shelter_name ?? pet.foster_profiles?.display_name ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(sourceRecord?.last_seen_at ?? pet.updated_at).toLocaleString("zh-TW")}</td>
                    <td className="px-4 py-3"><AdminPetActions petId={pet.id} sourceType={pet.source_type} actions={pet.source_type === "government" ? ["hide", "unpublish"] : ["hide", "unpublish", "archive"]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
