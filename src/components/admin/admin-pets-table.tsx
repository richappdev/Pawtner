import Link from "next/link";

import { AdminPetActions } from "@/components/admin/admin-pet-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PetSpecies, PetStatus } from "@/lib/schemas/pet";

export interface AdminPetListItem {
  id: string;
  name: string;
  species: PetSpecies;
  region: string | null;
  status: PetStatus;
  is_published: boolean;
  updated_at: string;
  foster_profiles?: {
    display_name?: string | null;
    region?: string | null;
  } | null;
}

const STATUS_OPTIONS: PetStatus[] = [
  "intake",
  "medical_hold",
  "available",
  "application_pending",
  "reserved",
  "trial_adoption",
  "adopted",
  "hidden",
  "archived",
];

const SPECIES_OPTIONS: PetSpecies[] = ["dog", "cat", "other"];

export function AdminPetsTable({
  pets,
  filters,
}: {
  pets: AdminPetListItem[];
  filters: {
    status?: string;
    species?: string;
    isPublished?: string;
    q?: string;
  };
}) {
  return (
    <div className="mt-8 space-y-6">
      <Card className="max-w-4xl">
        <form method="get" className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold">搜尋</span>
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="名稱或地區"
              className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">狀態</span>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"
            >
              <option value="">全部</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">物種</span>
            <select
              name="species"
              defaultValue={filters.species ?? ""}
              className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"
            >
              <option value="">全部</option>
              {SPECIES_OPTIONS.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">刊登</span>
            <select
              name="isPublished"
              defaultValue={filters.isPublished ?? ""}
              className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"
            >
              <option value="">全部</option>
              <option value="true">已刊登</option>
              <option value="false">未刊登</option>
            </select>
          </label>
          <div className="md:col-span-4">
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
            >
              套用篩選
            </button>
          </div>
        </form>
      </Card>

      {pets.length === 0 ? (
        <Card className="max-w-2xl">
          <p className="font-semibold">目前沒有毛孩資料</p>
          <p className="mt-2 text-sm leading-6 text-muted">調整篩選條件，或等待中途建立毛孩檔案。</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-surface-soft text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">名稱</th>
                <th className="px-4 py-3 font-semibold">物種</th>
                <th className="px-4 py-3 font-semibold">地區</th>
                <th className="px-4 py-3 font-semibold">狀態</th>
                <th className="px-4 py-3 font-semibold">刊登</th>
                <th className="px-4 py-3 font-semibold">中途</th>
                <th className="px-4 py-3 font-semibold">更新</th>
                <th className="px-4 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {pets.map((pet) => (
                <tr key={pet.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pets/${pet.id}`} className="font-semibold text-accent underline-offset-2 hover:underline">
                      {pet.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{pet.species}</td>
                  <td className="px-4 py-3">{pet.region ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge>{pet.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={pet.is_published ? "success" : "pending"}>
                      {pet.is_published ? "published" : "draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{pet.foster_profiles?.display_name ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {new Date(pet.updated_at).toLocaleString("zh-TW")}
                  </td>
                  <td className="px-4 py-3">
                    <AdminPetActions petId={pet.id} actions={["hide", "unpublish", "archive"]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
