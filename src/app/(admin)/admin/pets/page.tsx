import { AdminPetsTable, type AdminPetListItem } from "@/components/admin/admin-pets-table";
import { GovernmentSyncPanel } from "@/components/admin/government-sync-panel";
import { Card } from "@/components/ui/card";
import { listAdminPets } from "@/lib/pets/admin-query";
import { adminPetListQuerySchema } from "@/lib/schemas/pet";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const normalized = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = adminPetListQuerySchema.safeParse(normalized);
  const filters = parsed.success ? parsed.data : {
    status: undefined,
    species: undefined,
    source: undefined,
    isPublished: undefined,
    q: undefined,
  };
  const supabase = await createClient();
  const [{ data, error }, { data: source }, { data: runs }] = await Promise.all([
    listAdminPets(supabase, filters),
    supabase
      .from("pet_sources")
      .select("last_successful_sync_at,last_successful_record_count")
      .eq("source_key", "moa-animal-adoption")
      .maybeSingle(),
    supabase
      .from("pet_sync_runs")
      .select("status")
      .order("started_at", { ascending: false })
      .limit(1),
  ]);

  return (
    <main className="w-full p-6 md:p-10">
      <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">Operations</p>
      <h1 className="display mt-2 text-4xl">Pets</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        管理 Pawtner 中途動物的審核流程，以及政府來源的同步、加值內容與顯示狀態。
      </p>

      <GovernmentSyncPanel
        lastSuccessfulSyncAt={source?.last_successful_sync_at ?? null}
        recordCount={source?.last_successful_record_count ?? null}
        lastStatus={runs?.[0]?.status ?? null}
      />

      {error ? (
        <Card className="mt-8 max-w-2xl"><p className="font-semibold">無法載入動物列表。</p></Card>
      ) : (
        <AdminPetsTable
          pets={(data ?? []) as AdminPetListItem[]}
          filters={{
            status: filters.status,
            species: filters.species,
            source: filters.source,
            isPublished: filters.isPublished === undefined ? undefined : filters.isPublished ? "true" : "false",
            q: filters.q,
          }}
        />
      )}
    </main>
  );
}
