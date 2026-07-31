import Link from "next/link";

import { EmptyState, PageShell } from "@/components/page-shell";
import { PetCard } from "@/components/pet-card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { searchPublicPets } from "@/lib/pets/public-data";
import { SPECIES_LABELS } from "@/lib/pets/presentation";
import type { PetSourceType } from "@/lib/pets/public-types";
import type { PetSpecies } from "@/lib/schemas/pet";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "探索待認養毛孩",
  description: "搜尋 Pawtner 中途照護與政府收容所的待認養動物，依地區、物種與資料來源認識適合的毛孩。",
  path: "/explore",
});

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    species?: string;
    region?: string;
    source?: string;
    cursor?: string;
  }>;
}) {
  const filters = await searchParams;
  const page = await searchPublicPets({
    q: filters.q,
    species: filters.species as PetSpecies | undefined,
    region: filters.region,
    source: filters.source as PetSourceType | undefined,
    availability: "open",
    cursor: filters.cursor,
    limit: 24,
  }).catch(() => ({ items: [], nextCursor: null }));
  const nextParams = new URLSearchParams(
    Object.entries(filters).filter(([key, value]) => key !== "cursor" && Boolean(value)) as string[][],
  );
  if (page.nextCursor) nextParams.set("cursor", page.nextCursor);

  return (
    <PageShell
      eyebrow="EXPLORE"
      title="遇見正在等家的牠"
      description="搜尋 Pawtner 中途照護與政府收容所的待認養動物。政府資料會直接引導你聯絡官方收容所。"
      width="xl"
    >
      <form className="mt-8 grid gap-3 rounded-[20px] border bg-surface p-4 shadow-[var(--shadow-soft)] md:grid-cols-[1.5fr_.7fr_.7fr_.8fr_auto]">
        <label>
          <span className="field-label mb-2">搜尋</span>
          <Input name="q" defaultValue={filters.q ?? ""} placeholder="名字、品種、地區或收容所" />
        </label>
        <label>
          <span className="field-label mb-2">物種</span>
          <Select name="species" defaultValue={filters.species ?? ""}>
            <option value="">全部</option>
            {Object.entries(SPECIES_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </label>
        <label>
          <span className="field-label mb-2">地區</span>
          <Input name="region" defaultValue={filters.region ?? ""} placeholder="例如：臺北市" />
        </label>
        <label>
          <span className="field-label mb-2">資料來源</span>
          <Select name="source" defaultValue={filters.source ?? ""}>
            <option value="">全部</option>
            <option value="private_foster">Pawtner 中途</option>
            <option value="government">政府開放資料</option>
          </Select>
        </label>
        <Button type="submit" className="self-end">套用篩選</Button>
      </form>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold">本頁 <span className="text-accent">{page.items.length}</span> 筆</p>
        {filters.q || filters.species || filters.region || filters.source || filters.cursor ? (
          <Link href="/explore" className="text-sm font-bold text-accent underline underline-offset-4">
            清除篩選
          </Link>
        ) : null}
      </div>

      {page.items.length ? (
        <>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {page.items.map((pet) => <PetCard key={pet.id} pet={pet} />)}
          </div>
          {page.nextCursor ? (
            <div className="mt-8 flex justify-center">
              <Link
                href={`/explore?${nextParams.toString()}`}
                className="rounded-xl border bg-surface px-6 py-3 text-sm font-bold text-accent hover:bg-surface-soft"
              >
                下一頁
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="找不到符合條件的動物"
          description="請放寬地區或來源條件後再試一次。"
          action={{ href: "/explore", label: "清除篩選" }}
        />
      )}
    </PageShell>
  );
}
