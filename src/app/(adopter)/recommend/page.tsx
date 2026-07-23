import { EmptyState, PageShell } from "@/components/page-shell";

export default function RecommendPage() {
  return <PageShell eyebrow="RECOMMEND" title="為你選幾位新朋友"><EmptyState title="還需要一點你的偏好" description="居住空間、作息與照顧經驗，都能幫我們做出更合適的推薦。" action={{ href: "/me", label: "填寫我的偏好" }} /></PageShell>;
}
