import { Card } from "@/components/ui/card";
import { noIndexRobots, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "試營運上線清單",
  description: "Pawtner 封閉試營運內部檢查清單。",
  path: "/pilot",
  robots: noIndexRobots,
});

const items = [
  "確認邀請、登入與角色權限",
  "建立毛孩草稿並補齊必要資料",
  "提交資料並完成合作團隊審核",
  "確認公開頁不含私人地址與內部備註",
  "走查收藏、申請與狀態變更流程",
  "確認捐款、物資與功能開關",
  "記錄問題、回報與後續修正",
];

export default function PilotPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-12 sm:px-7 sm:py-16">
      <p className="eyebrow">CLOSED PILOT</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">試營運上線清單</h1>
      <p className="mt-4 max-w-2xl leading-7 text-muted">用一致的順序確認最重要的信任、資料與操作路徑。</p>
      <div className="mt-10 grid gap-4">
        {items.map((item, index) => (
          <Card key={item} tone={index % 3 === 1 ? "mint" : "surface"} className="flex items-center gap-5">
            <span className="latin-display text-3xl text-clay">{String(index + 1).padStart(2, "0")}</span>
            <span className="font-bold">{item}</span>
          </Card>
        ))}
      </div>
    </main>
  );
}
