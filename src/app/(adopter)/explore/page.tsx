import { EmptyState, PageShell } from "@/components/page-shell";

export default function ExplorePage() {
  return <PageShell eyebrow="EXPLORE" title="認識正在等你的牠"><EmptyState title="毛孩資料即將在這裡出現" description="先告訴我們你的生活方式，我們會把適合的相遇放在前面。" action={{ href: "/recommend", label: "開始推薦" }} /></PageShell>;
}
