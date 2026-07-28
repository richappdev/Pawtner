import Link from "next/link";

import { PetCover } from "@/components/pet-media";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VerificationRow } from "@/components/verification-row";
import {
  formatAge,
  PET_STATUS_PRESENTATION,
  SEX_LABELS,
} from "@/lib/pets/presentation";
import type { PublicPetSummary } from "@/lib/pets/public-types";

export function PetCard({ pet }: { pet: PublicPetSummary }) {
  const status = PET_STATUS_PRESENTATION[pet.status];
  return (
    <Card interactive className="group overflow-hidden p-0">
      <Link href={`/pets/${pet.id}`} className="block">
        <div className="relative">
          <PetCover media={pet.coverMedia} name={pet.name} className="aspect-square" />
          <Badge
            variant={status.variant}
            icon={<span aria-hidden="true">{status.icon}</span>}
            className="absolute left-3 top-3 shadow-sm"
          >
            {status.label}
          </Badge>
          <span
            aria-hidden="true"
            className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-xl text-accent shadow-sm"
          >
            ♡
          </span>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="display text-2xl">{pet.name}</h2>
              <span className="pt-1 text-sm font-bold text-muted">{pet.profileCompleteness}%</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {[pet.sex ? SEX_LABELS[pet.sex] : null, formatAge(pet.ageMonths), pet.breed].filter(Boolean).join("・")}
            </p>
          </div>
          <VerificationRow
            name={pet.organization?.name ?? pet.fosterDisplayName}
            verified={pet.organization?.isVerified ?? false}
          />
          {pet.temperamentTags.length ? (
            <div className="flex flex-wrap gap-2">
              {pet.temperamentTags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="neutral">{tag}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">個性觀察持續補充中</p>
          )}
          <p className="font-bold text-accent group-hover:underline">認識 {pet.name} →</p>
        </div>
      </Link>
    </Card>
  );
}
