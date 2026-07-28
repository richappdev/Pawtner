import { EmptyState, PageShell } from "@/components/page-shell";

export default function FosterMessagesPage() {
  return (
    <PageShell eyebrow="MESSAGES" title="訊息" description="與申請人的交流將集中在同一個安全、可追溯的地方。" width="lg" role="foster">
      <EmptyState title="安全訊息功能尚未啟用" description="封閉試營運目前不提供站內訊息。功能完成前，這裡不會顯示無法使用的對話框。" action={{ href: "/foster", label: "回到今日總覽" }} />
    </PageShell>
  );
}
