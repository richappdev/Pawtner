import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function FosterMaterialsPage() {
  return (
    <PageShell eyebrow="MATERIALS" title="照護物資" description="把毛孩需要的物資與採購紀錄放在同一個位置。" width="lg" role="foster" headerAction={<ButtonLink href="/products" variant="warm">瀏覽物資</ButtonLink>}>
      <Card tone="warm" className="mt-8">
        <h2 className="display text-2xl">願望清單仍在準備中</h2>
        <p className="mt-3 max-w-xl leading-7 text-muted">物資可以先瀏覽；建立公開願望清單與採購追蹤功能尚未啟用。</p>
      </Card>
    </PageShell>
  );
}
