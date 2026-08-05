"use client";

import Link from "next/link";

import { PetCover } from "@/components/pet-media";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VerificationRow } from "@/components/verification-row";
import { PET_STATUS_PRESENTATION } from "@/lib/pets/presentation";
import type { PublicPetSummary } from "@/lib/pets/public-types";
import { trackEvent } from "@/lib/firebase/observability";
import { useTranslations } from "next-intl";

export function PetCard({
  pet,
  listId = "explore_results",
}: {
  pet: PublicPetSummary;
  listId?: "home_featured" | "explore_results";
}) {
  const status = PET_STATUS_PRESENTATION[pet.status];
  const t = useTranslations("SharedPet");
  const enumT = useTranslations("Enums");
  const detailT = useTranslations("PetDetail");
  const age = pet.ageMonths
    ? pet.ageMonths >= 12
      ? pet.ageMonths % 12
        ? detailT("ageYearsMonths", { years: Math.floor(pet.ageMonths / 12), months: pet.ageMonths % 12 })
        : detailT("ageYears", { years: Math.floor(pet.ageMonths / 12) })
      : detailT("ageMonths", { count: pet.ageMonths })
    : pet.ageBand === "child"
      ? t("young")
      : pet.ageBand === "adult"
        ? t("adult")
        : pet.ageBand === "senior"
          ? t("senior")
          : null;

  return (
    <Card interactive className="group overflow-hidden p-0">
      <Link
        href={`/pets/${pet.id}`}
        className="block"
        onClick={() => void trackEvent("select_item", {
          item_list_id: listId,
          species: pet.species,
          source_type: pet.sourceType,
          status: pet.status,
          region_present: Boolean(pet.region),
        })}
      >
        <div className="relative">
          <PetCover media={pet.coverMedia} name={pet.name} className="aspect-square" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge variant={status.variant} icon={<span aria-hidden="true">{status.icon}</span>}>
              {enumT(pet.status)}
            </Badge>
            <Badge variant={pet.sourceType === "government" ? "pending" : "neutral"}>
              {pet.sourceType === "government" ? t("governmentSource") : t("fosterSource")}
            </Badge>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="display min-w-0 flex-1 break-words text-xl leading-tight">{pet.name}</h2>
              <span className="shrink-0 pt-1 text-sm font-bold text-muted">{pet.profileCompleteness}%</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {[pet.sex ? enumT(pet.sex) : null, age, pet.breed].filter(Boolean).join(" · ")}
            </p>
          </div>
          {pet.sourceType === "government" ? (
            <div className="text-sm">
              <p className="font-bold">{pet.shelter?.name ?? pet.source?.label}</p>
              <p className="mt-1 text-xs text-muted">{pet.freshnessText}</p>
            </div>
          ) : (
            <VerificationRow
              name={pet.organization?.name ?? pet.fosterDisplayName}
              verified={pet.organization?.isVerified ?? false}
            />
          )}
          {pet.temperamentTags.length ? (
            <div className="flex flex-wrap gap-2">
              {pet.temperamentTags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="neutral">{tag}</Badge>
              ))}
            </div>
          ) : null}
          <p className="font-bold text-accent group-hover:underline">
            {pet.sourceType === "government" ? t("viewShelter") : t("meetPet", { name: pet.name })}
          </p>
        </div>
      </Link>
    </Card>
  );
}
