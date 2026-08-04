import { PetSubmitButton } from "@/components/foster/pet-submit-button";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PET_REVIEW_PRESENTATION, PET_STATUS_PRESENTATION } from "@/lib/pets/presentation";
import type { PetStatus } from "@/lib/schemas/pet";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function FosterPetsPage() {
  const [t, enumT] = await Promise.all([getTranslations("Foster"), getTranslations("Enums")]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("pets")
    .select("id,name,status,review_status,updated_at")
    .eq("source_type", "private_foster")
    .order("updated_at", { ascending: false });

  return (
    <PageShell
      eyebrow="PETS"
      title={t("myPets")}
      description={t("myPetsDescription")}
      width="lg"
      role="foster"
      headerAction={<ButtonLink href="/foster/pets/new">{t("addPet")}</ButtonLink>}
    >
      {(data ?? []).length === 0 ? (
        <EmptyState
          title={t("noPets")}
          description={t("noPetsDescription")}
          action={{ href: "/foster/pets/new", label: t("createPet") }}
        />
      ) : (
        <div className="mt-8 space-y-4">
          {(data ?? []).map((pet) => {
            const status = PET_STATUS_PRESENTATION[pet.status as PetStatus];
            const review = PET_REVIEW_PRESENTATION[pet.review_status] ?? PET_REVIEW_PRESENTATION.draft;
            return (
              <Card key={pet.id} className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="display text-2xl">{pet.name}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={status.variant} icon={<span aria-hidden="true">{status.icon}</span>}>{enumT(pet.status)}</Badge>
                    <Badge variant={review.variant} icon={<span aria-hidden="true">{review.icon}</span>}>{enumT(pet.review_status)}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ButtonLink href={`/foster/pets/${pet.id}/edit`} variant="secondary">{t("edit")}</ButtonLink>
                  {pet.review_status !== "pending_review" ? (
                    <PetSubmitButton petId={pet.id} />
                  ) : (
                    <span className="text-sm font-bold text-muted">{t("inReview")}</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
