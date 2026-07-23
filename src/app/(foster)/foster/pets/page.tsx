import { EmptyState, PageShell } from "@/components/page-shell";

export default function FosterPetsPage() {
  return <PageShell eyebrow="PETS" title="我的毛孩"><EmptyState title="還沒有公開中的毛孩" description="建立第一份資料，讓領養者看見牠的個性與需求。" action={{ href: "/foster/pets/new", label: "新增毛孩" }} /></PageShell>;
}
