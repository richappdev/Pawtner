import { LogoutButton } from "@/components/logout-button";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";

export default function MePage() {
  return (
    <PageShell
      eyebrow="MY PAWTNER"
      title="我的生活準備"
      description="這些資訊用來說明適配原因與需要確認的地方，不會自動決定你能否領養。"
      width="lg"
      headerAction={<LogoutButton />}
    >
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["住家與成員", "尚未填寫"],
          ["作息與陪伴", "尚未填寫"],
          ["照護經驗", "尚未填寫"],
        ].map(([title, status]) => (
          <Card key={title}>
            <p className="font-bold">{title}</p>
            <p className="mt-2 text-sm text-muted">{status}</p>
          </Card>
        ))}
      </div>
      <EmptyState
        title="偏好問卷仍在準備中"
        description="正式開放後，你可以逐步補充生活資訊，系統會明確標示哪些答案影響推薦，以及哪些仍需要中途確認。"
        action={{ href: "/explore", label: "先認識毛孩" }}
      />
    </PageShell>
  );
}
