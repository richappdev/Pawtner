import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState, PageShell } from "@/components/page-shell";
import { PetCard } from "@/components/pet-card";
import { PetListAnalytics } from "@/components/adoption-analytics";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { searchPublicPets } from "@/lib/pets/public-data";
import type { PetSourceType } from "@/lib/pets/public-types";
import type { PetSpecies } from "@/lib/schemas/pet";
import { localizedPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedPageMetadata("exploreTitle", "/explore"); }

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
  const [t, enums] = await Promise.all([getTranslations("Public"), getTranslations("Enums")]);
  const speciesOptions = ["dog", "cat", "other"] as const;
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
      eyebrow={t("exploreEyebrow")}
      title={t("exploreTitle")}
      description={t("exploreDescription")}
      width="xl"
    >
      <form className="mt-8 grid gap-3 rounded-[20px] border bg-surface p-4 shadow-[var(--shadow-soft)] md:grid-cols-[1.5fr_.7fr_.7fr_.8fr_auto]">
        <label>
          <span className="field-label mb-2">{t("search")}</span>
          <Input name="q" defaultValue={filters.q ?? ""} placeholder={t("searchPetPlaceholder")} />
        </label>
        <label>
          <span className="field-label mb-2">{t("species")}</span>
          <Select name="species" defaultValue={filters.species ?? ""}>
            <option value="">{t("all")}</option>
            {speciesOptions.map((value) => (
              <option key={value} value={value}>{enums(value)}</option>
            ))}
          </Select>
        </label>
        <label>
          <span className="field-label mb-2">{t("region")}</span>
          <Input name="region" defaultValue={filters.region ?? ""} placeholder={t("regionPlaceholder")} />
        </label>
        <label>
          <span className="field-label mb-2">{t("source")}</span>
          <Select name="source" defaultValue={filters.source ?? ""}>
            <option value="">{t("all")}</option>
            <option value="private_foster">{t("privateFoster")}</option>
            <option value="government">{t("governmentData")}</option>
          </Select>
        </label>
        <Button type="submit" className="self-end">{t("applyFilter")}</Button>
      </form>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold">{t("pageCount", { count: page.items.length })}</p>
        {filters.q || filters.species || filters.region || filters.source || filters.cursor ? (
          <Link href="/explore" className="text-sm font-bold text-accent underline underline-offset-4">
            {t("clearFilters")}
          </Link>
        ) : null}
      </div>

      <PetListAnalytics
        listId="explore_results"
        resultCount={page.items.length}
        filters={{
          query: Boolean(filters.q),
          species: Boolean(filters.species),
          region: Boolean(filters.region),
          source: Boolean(filters.source),
        }}
      />
      {page.items.length ? (
        <>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {page.items.map((pet) => <PetCard key={pet.id} pet={pet} listId="explore_results" />)}
          </div>
          {page.nextCursor ? (
            <div className="mt-8 flex justify-center">
              <Link
                href={`/explore?${nextParams.toString()}`}
                className="rounded-xl border bg-surface px-6 py-3 text-sm font-bold text-accent hover:bg-surface-soft"
              >
                {t("nextPage")}
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          title={t("noResults")}
          description={t("noResultsDescription")}
          action={{ href: "/explore", label: t("clearFilters") }}
        />
      )}
    </PageShell>
  );
}
