import { AdminPetsTable, type AdminPetListItem } from "@/components/admin/admin-pets-table";
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
  const filters = parsed.success
    ? parsed.data
    : { status: undefined, species: undefined, isPublished: undefined, q: undefined };

  const supabase = await createClient();
  const { data, error } = await listAdminPets(supabase, {
    status: filters.status,
    species: filters.species,
    isPublished: filters.isPublished,
    q: filters.q,
  });

  return (
    <main className="w-full p-6 md:p-10">
      <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">Operations</p>
      <h1 className="display mt-2 text-4xl">Pets</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        審核與監管全站毛孩刊登。可隱藏、下架或封存，並留下稽核紀錄。
      </p>

      {error ? (
        <Card className="mt-8 max-w-2xl">
          <p className="font-semibold">無法載入毛孩清單</p>
          <p className="mt-2 text-sm leading-6 text-muted">請稍後再試。</p>
        </Card>
      ) : (
        <AdminPetsTable
          pets={(data ?? []) as AdminPetListItem[]}
          filters={{
            status: filters.status,
            species: filters.species,
            isPublished:
              filters.isPublished === undefined ? undefined : filters.isPublished ? "true" : "false",
            q: filters.q,
          }}
        />
      )}
    </main>
  );
}
