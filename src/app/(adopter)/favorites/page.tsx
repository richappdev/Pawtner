import { EmptyState, PageShell } from "@/components/page-shell";
import { noIndexRobots, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "收藏的毛孩",
  description: "個人收藏清單。",
  path: "/favorites",
  robots: noIndexRobots,
});

export default function FavoritesPage() {
  return (
    <PageShell
      eyebrow="FAVORITES"
      title="想再多認識的牠"
      description="收藏是留下一個稍後回來理解的記號，不代表承諾，也不需要急著申請。"
      width="lg"
    >
      <EmptyState
        title="還沒有收藏的毛孩"
        description="看到有感覺的毛孩時，可以先收藏，再慢慢比較生活需求、照護條件與資料完整度。"
        action={{ href: "/explore", label: "去探索毛孩" }}
      />
    </PageShell>
  );
}
