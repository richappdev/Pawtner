import Link from "next/link";

import { PetCover } from "@/components/pet-media";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VerificationRow } from "@/components/verification-row";
import { formatAge, PET_STATUS_PRESENTATION, SEX_LABELS } from "@/lib/pets/presentation";
import type { PublicPetSummary } from "@/lib/pets/public-types";

export function PetCard({ pet }: { pet: PublicPetSummary }) {
  const status = PET_STATUS_PRESENTATION[pet.status];
  const age = pet.ageMonths
    ? formatAge(pet.ageMonths)
    : pet.ageBand === "child"
      ? "幼年"
      : pet.ageBand === "adult"
        ? "成年"
        : pet.ageBand === "senior"
          ? "高齡"
          : null;

  return (
    <Card interactive className="group overflow-hidden p-0">
      <Link href={`/pets/${pet.id}`} className="block">
        <div className="relative">
          <PetCover media={pet.coverMedia} name={pet.name} className="aspect-square" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge variant={status.variant} icon={<span aria-hidden="true">{status.icon}</span>}>
              {status.label}
            </Badge>
            <Badge variant={pet.sourceType === "government" ? "pending" : "neutral"}>
              {pet.sourceType === "government" ? "政府開放資料" : "Pawtner 中途"}
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
              {[pet.sex ? SEX_LABELS[pet.sex] : null, age, pet.breed].filter(Boolean).join(" · ")}
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
            {pet.sourceType === "government" ? "查看收容所聯絡方式" : `認識 ${pet.name}`}
          </p>
        </div>
      </Link>
    </Card>
  );
}
