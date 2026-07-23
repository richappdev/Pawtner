import { EmptyState, PageShell } from "@/components/page-shell";

export default function MePage() {
  return <PageShell eyebrow="ME" title="我的 Pawtner"><EmptyState title="建立你的領養偏好" description="簡短說說你的居住與生活情況，讓推薦更貼近你與毛孩的需要。" action={{ href: "/recommend", label: "設定偏好" }} /></PageShell>;
}
