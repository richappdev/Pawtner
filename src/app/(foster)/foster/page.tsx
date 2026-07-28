import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function FosterOverviewPage() {
  return (
    <PageShell
      eyebrow="FOSTER SPACE"
      title="今天，照顧得還好嗎？"
      description="把最需要處理的資料、申請與照護事項放在前面，其餘工作可以慢慢來。"
      width="lg"
      role="foster"
      headerAction={<ButtonLink href="/foster/pets/new">新增毛孩</ButtonLink>}
    >
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          ["待補資料", "0", "補齊生命紀錄後才能送審"],
          ["審核中", "0", "合作團隊正在依序確認"],
          ["新申請", "0", "目前沒有需要回覆的申請"],
        ].map(([title, value, description], index) => (
          <Card key={title} tone={index === 0 ? "warm" : index === 1 ? "mint" : "surface"}>
            <p className="data-label">{title}</p>
            <p className="latin-display mt-3 text-4xl">{value}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <p className="eyebrow">TODAY</p>
        <h2 className="display mt-2 text-2xl">目前沒有緊急待辦</h2>
        <p className="mt-3 leading-7 text-muted">新增或更新毛孩資料後，這裡會顯示下一個最有用的行動。</p>
      </Card>
    </PageShell>
  );
}
