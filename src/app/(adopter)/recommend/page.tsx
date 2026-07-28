import { EmptyState, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";

export default function RecommendPage() {
  return (
    <PageShell
      eyebrow="RECOMMEND"
      title="為你選幾位新朋友"
      description="推薦不是替你做決定，而是把生活條件相近、仍需確認的地方清楚整理出來。"
      width="lg"
    >
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["居住環境", "空間、地區與家中成員"],
          ["日常作息", "陪伴時間、活動量與獨處安排"],
          ["照護準備", "醫療、梳理與過往經驗"],
        ].map(([title, description], index) => (
          <Card key={title} tone={index === 1 ? "mint" : "surface"}>
            <p className="latin-display text-2xl text-clay">0{index + 1}</p>
            <h2 className="display mt-3 text-xl">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </Card>
        ))}
      </div>
      <EmptyState
        title="還需要一點你的生活資訊"
        description="完成偏好後，每項推薦都會顯示 2–3 個適合原因、仍需確認的問題，以及目前缺少的資料。"
        action={{ href: "/me", label: "填寫我的偏好" }}
      />
    </PageShell>
  );
}
