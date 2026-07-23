import { EmptyState, PageShell } from "@/components/page-shell";

export default function FavoritesPage() {
  return <PageShell eyebrow="FAVORITES" title="你的收藏"><EmptyState title="還沒有收藏的毛孩" description="看見有感覺的毛孩時，記得收藏，方便之後再認識牠。" action={{ href: "/explore", label: "去探索" }} /></PageShell>;
}
