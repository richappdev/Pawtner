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
  const { data } = await supabase.from("pets").select("id,name,status,review_status,updated_at").order("updated_at", { ascending: false });
  return (
    <PageShell
      eyebrow="PETS"
      title="我的毛孩"
      description="每一份生命紀錄都會清楚顯示完成度、送審狀態與下一步。"
      width="lg"
      role="foster"
      headerAction={<ButtonLink href="/foster/pets/new">新增毛孩</ButtonLink>}
    >
      {(data ?? []).length === 0 ? (
        <EmptyState
          title="尚未建立毛孩資料"
          description="先建立基本資料，再逐步補上照片、個性、健康與適合的家庭條件。草稿不會對外公開。"
          action={{ href: "/foster/pets/new", label: "建立第一份資料" }}
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
                {pet.review_status !== "pending_review" ? (
                  <PetSubmitButton petId={pet.id} />
                ) : (
                  <span className="text-sm font-bold text-muted">等待合作團隊審核</span>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
