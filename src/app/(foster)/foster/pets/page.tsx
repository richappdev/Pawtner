import { PetSubmitButton } from "@/components/foster/pet-submit-button";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PET_REVIEW_PRESENTATION, PET_STATUS_PRESENTATION } from "@/lib/pets/presentation";
import type { PetStatus } from "@/lib/schemas/pet";
import { createClient } from "@/lib/supabase/server";

export default async function FosterPetsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pets")
    .select("id,name,status,review_status,updated_at")
    .eq("source_type", "private_foster")
    .order("updated_at", { ascending: false });

  return (
    <PageShell
      eyebrow="PETS"
      title="我的動物"
      description="建立、編輯並提交你照護中的待認養動物。"
      width="lg"
      role="foster"
      headerAction={<ButtonLink href="/foster/pets/new">新增動物</ButtonLink>}
    >
      {(data ?? []).length === 0 ? (
        <EmptyState
          title="尚未建立動物資料"
          description="先建立第一筆資料，再提交給 Pawtner 團隊審核。"
          action={{ href: "/foster/pets/new", label: "建立動物" }}
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
                    <Badge variant={status.variant} icon={<span aria-hidden="true">{status.icon}</span>}>{status.label}</Badge>
                    <Badge variant={review.variant} icon={<span aria-hidden="true">{review.icon}</span>}>{review.label}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ButtonLink href={`/foster/pets/${pet.id}/edit`} variant="secondary">編輯</ButtonLink>
                  {pet.review_status !== "pending_review" ? (
                    <PetSubmitButton petId={pet.id} />
                  ) : (
                    <span className="text-sm font-bold text-muted">審核中</span>
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
