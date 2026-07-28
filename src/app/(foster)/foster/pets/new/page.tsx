import { PetCreateForm } from "@/components/foster/pet-create-form";
import { PageShell } from "@/components/page-shell";

export default function NewPetPage() {
  return (
    <PageShell
      eyebrow="NEW PET"
      title="新增毛孩"
      description="先建立可儲存的草稿。資料通過合作團隊審核前，不會出現在公開探索頁面。"
      width="lg"
      role="foster"
      breadcrumbs={[{ href: "/foster/pets", label: "我的毛孩" }]}
    >
      <PetCreateForm />
    </PageShell>
  );
}
