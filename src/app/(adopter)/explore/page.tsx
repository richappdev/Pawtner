import { EmptyState, PageShell } from "@/components/page-shell";
import { PetCard } from "@/components/pet-card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { listPublicPets } from "@/lib/pets/public-data";
import { SPECIES_LABELS } from "@/lib/pets/presentation";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; species?: string; region?: string }>;
}) {
  const filters = await searchParams;
  const pets = await listPublicPets().catch(() => []);
  const query = filters.q?.trim().toLocaleLowerCase("zh-TW") ?? "";
  const filtered = pets.filter((pet) => {
    const matchesQuery = !query || [pet.name, pet.breed, pet.region, pet.fosterDisplayName]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase("zh-TW").includes(query));
    const matchesSpecies = !filters.species || pet.species === filters.species;
    const matchesRegion = !filters.region || pet.region?.includes(filters.region);
    return matchesQuery && matchesSpecies && matchesRegion;
  });

  return (
    <PageShell
      eyebrow="EXPLORE"
      title="遇見正在等家的牠"
      description="先從真實生活、照護需求與資料來源認識彼此，不急著做決定。"
      width="xl"
    >
      <form className="mt-8 grid gap-3 rounded-[20px] border bg-surface p-4 shadow-[var(--shadow-soft)] md:grid-cols-[1.6fr_.7fr_.7fr_auto]">
        <label>
          <span className="field-label mb-2">搜尋</span>
          <Input name="q" defaultValue={filters.q ?? ""} placeholder="名字、品種、地區或中途" />
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
          <Input name="region" defaultValue={filters.region ?? ""} placeholder="縣市" />
        </label>
        <Button type="submit" className="self-end">套用篩選</Button>
      </form>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold"><span className="text-accent">{filtered.length}</span> 位毛孩</p>
        {filters.q || filters.species || filters.region ? (
          <a href="/explore" className="text-sm font-bold text-accent underline underline-offset-4">清除篩選</a>
        ) : null}
      </div>

      {filtered.length ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((pet) => <PetCard key={pet.id} pet={pet} />)}
        </div>
      ) : (
        <EmptyState
          title={pets.length ? "這組條件目前沒有結果" : "公開毛孩資料正在準備中"}
          description={pets.length ? "試著放寬地區或物種條件，也可以清除搜尋重新看看。" : "資料通過合作團隊確認後才會公開。先完成生活偏好，我們會在有合適毛孩時提供更清楚的理由。"}
          action={pets.length ? { href: "/explore", label: "清除篩選" } : { href: "/recommend", label: "填寫生活偏好" }}
        />
      )}
    </PageShell>
  );
}
