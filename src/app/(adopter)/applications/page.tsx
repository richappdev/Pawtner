import { EmptyState, PageShell } from "@/components/page-shell";

export default function ApplicationsPage() {
  return <PageShell eyebrow="APPLICATIONS" title="領養申請"><EmptyState title="尚未送出申請" description="當你準備好，從毛孩頁面開始一份認真的領養申請。" action={{ href: "/explore", label: "查看毛孩" }} /></PageShell>;
}
