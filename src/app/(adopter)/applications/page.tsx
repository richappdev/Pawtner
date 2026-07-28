import { EmptyState, PageShell } from "@/components/page-shell";
import { ProcessStepper } from "@/components/process-stepper";
import { Card } from "@/components/ui/card";

const STEPS = ["送出申請", "初步評估", "彼此訪談", "見面／試養"] as const;

export default function ApplicationsPage() {
  return (
    <PageShell
      eyebrow="APPLICATIONS"
      title="領養申請"
      description="每個狀態都會說明目前由誰處理、接下來要做什麼，以及是否需要補充資料。"
      width="lg"
    >
      <Card tone="neutral" className="mt-8">
        <p className="data-label">一般流程</p>
        <div className="mt-4"><ProcessStepper steps={STEPS} current={0} /></div>
      </Card>
      <EmptyState
        title="尚未送出申請"
        description="當你已經讀過毛孩的完整紀錄，也願意進一步討論彼此生活時，再從毛孩頁面開始申請。"
        action={{ href: "/explore", label: "查看毛孩" }}
      />
    </PageShell>
  );
}
