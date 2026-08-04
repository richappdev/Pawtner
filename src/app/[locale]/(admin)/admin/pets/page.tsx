import { AdminPetsTable, type AdminPetListItem } from "@/components/admin/admin-pets-table";
import { GovernmentSyncPanel } from "@/components/admin/government-sync-panel";
import { Card } from "@/components/ui/card";
import { listAdminPetRegions, listAdminPets } from "@/lib/pets/admin-query";
import { adminPetPageQuerySchema } from "@/lib/schemas/pet";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

const DEFAULT_REGION = "臺北市";

export default async function AdminPetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [t, navigation] = await Promise.all([getTranslations("Admin"), getTranslations("Navigation")]);
  const raw = await searchParams;
  const normalized = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = adminPetPageQuerySchema.safeParse(normalized);
  const base = parsed.success ? parsed.data : {
    status: undefined,
    species: undefined,
    source: undefined,
    reviewStatus: undefined,
    qualityStatus: undefined,
    publicationStatus: undefined,
    isPublished: undefined,
    q: undefined,
    region: undefined,
    page: 1,
    pageSize: 10,
  };
  const region =
    !("region" in normalized) ? DEFAULT_REGION
    : normalized.region?.trim() ? normalized.region.trim()
    : undefined;
  const filters = { ...base, region };
  const offset = (filters.page - 1) * filters.pageSize;
  const supabase = await createClient();
  const [{ data, error, count }, regionOptions, { data: source }, { data: runs }] = await Promise.all([
    listAdminPets(supabase, {
      ...filters,
      limit: filters.pageSize,
      offset,
    }),
    listAdminPetRegions(supabase),
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
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const options = region && !regionOptions.includes(region)
    ? [...regionOptions, region].sort((a, b) => a.localeCompare(b, "zh-Hant"))
    : regionOptions;

  if (!error && filters.page > totalPages) {
    const canonical = new URLSearchParams();
    for (const [key, value] of Object.entries(normalized)) {
      if (value !== undefined) canonical.set(key, value);
    }
    if (!("region" in normalized) && region) canonical.set("region", region);
    canonical.set("page", String(totalPages));
    redirect(`/admin/pets?${canonical.toString()}`);
  }

  return (
    <main className="w-full p-6 md:p-10">
      <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">{navigation("operations")}</p>
      <h1 className="display mt-2 text-4xl">{t("titles.pets")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        {t("petsDescription")}
      </p>

      <GovernmentSyncPanel
        lastSuccessfulSyncAt={source?.last_successful_sync_at ?? null}
        recordCount={source?.last_successful_record_count ?? null}
        lastStatus={runs?.[0]?.status ?? null}
      />

      {error ? (
        <Card className="mt-8 max-w-2xl"><p className="font-semibold">{t("petsLoadFailed")}</p></Card>
      ) : (
        <AdminPetsTable
          key={`${filters.page}:${filters.pageSize}:${JSON.stringify(filters)}`}
          pets={(data ?? []) as unknown as AdminPetListItem[]}
          filters={{
            status: filters.status,
            species: filters.species,
            source: filters.source,
            reviewStatus: filters.reviewStatus,
            qualityStatus: filters.qualityStatus,
            publicationStatus: filters.publicationStatus,
            isPublished: filters.isPublished === undefined ? undefined : filters.isPublished ? "true" : "false",
            q: filters.q,
            region: filters.region,
          }}
          regionOptions={options}
          page={filters.page}
          pageSize={filters.pageSize}
          total={total}
          totalPages={totalPages}
        />
      )}
    </main>
  );
}
