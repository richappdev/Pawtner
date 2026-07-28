import { EmptyState, PageShell } from "@/components/page-shell";

export default function FosterApplicationsPage() {
  return (
    <PageShell eyebrow="APPLICATIONS" title="領養申請" description="申請會依時間排列，並標示目前狀態、待確認資訊與下一個負責人。" width="lg" role="foster">
      <EmptyState title="還沒有新申請" description="毛孩資料核准並公開後，送出的申請會在這裡依序出現；系統不會用空白假資料模擬申請。" action={{ href: "/foster/pets", label: "查看毛孩公開狀態" }} />
    </PageShell>
  );
}
