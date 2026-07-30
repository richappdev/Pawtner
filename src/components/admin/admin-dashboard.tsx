import Link from "next/link";

import { Card } from "@/components/ui/card";
import type {
  AdminDashboardStats,
  DashboardMetric,
} from "@/lib/admin/dashboard-stats";

const numberFormatter = new Intl.NumberFormat("zh-TW");

function formatMetricValue(metric: DashboardMetric): string {
  return metric.value === null ? "—" : numberFormatter.format(metric.value);
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const value = formatMetricValue(metric);
  const tone = metric.tone === "success"
    ? "mint"
    : metric.tone === "neutral"
      ? "surface"
      : "warm";

  return (
    <Link
      href={metric.href}
      aria-label={`${metric.label}：${value}`}
      className="group block rounded-[20px] focus-visible:outline-offset-4"
    >
      <Card
        tone={tone}
        interactive
        className={metric.tone === "danger" ? "border-clay/40 bg-[#fff4f1]" : undefined}
      >
        <p className="text-sm font-bold text-muted">{metric.label}</p>
        <p
          className={`latin-display mt-3 text-4xl font-semibold ${
            metric.tone === "danger" ? "text-clay" : "text-ink"
          }`}
        >
          {value}
        </p>
        <p className={`mt-3 text-xs font-semibold ${
          metric.error ? "text-clay" : "text-accent group-hover:underline"
        }`}>
          {metric.error ? "資料暫時無法取得" : "查看詳情"}
        </p>
      </Card>
    </Link>
  );
}

function MetricGrid({
  metrics,
}: {
  metrics: DashboardMetric[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
    </div>
  );
}

export function AdminDashboard({ stats }: { stats: AdminDashboardStats }) {
  const updatedAt = new Date(stats.updatedAt).toLocaleString("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  });

  return (
    <div className="space-y-10">
      {stats.hasErrors ? (
        <div role="alert" className="rounded-2xl border border-clay/30 bg-[#fff4f1] px-4 py-3 text-sm">
          部分統計資料暫時無法取得；其他數字仍為即時資料。
        </div>
      ) : null}

      <section aria-labelledby="dashboard-actions-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="dashboard-actions-heading" className="display text-2xl">需要處理</h2>
            <p className="mt-1 text-sm text-muted">優先掌握審核、履約與安全相關工作。</p>
          </div>
          <p className="text-xs text-muted">更新時間：{updatedAt}</p>
        </div>
        <MetricGrid metrics={stats.actionRequired} />
      </section>

      <section aria-labelledby="dashboard-health-heading">
        <div className="mb-5">
          <h2 id="dashboard-health-heading" className="display text-2xl">平台概況</h2>
          <p className="mt-1 text-sm text-muted">目前送養服務與領養流程的整體狀態。</p>
        </div>
        <MetricGrid metrics={stats.platformHealth} />
      </section>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div aria-label="正在載入管理儀表板統計" className="space-y-10">
      {[8, 4].map((count, groupIndex) => (
        <section key={count} aria-hidden="true">
          <div className="mb-5 h-8 w-36 animate-pulse rounded-lg bg-sage/40" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: count }, (_, index) => (
              <Card key={`${groupIndex}-${index}`} tone="neutral">
                <div className="h-4 w-28 animate-pulse rounded bg-sage/40" />
                <div className="mt-4 h-10 w-20 animate-pulse rounded bg-sage/40" />
                <div className="mt-4 h-3 w-16 animate-pulse rounded bg-sage/40" />
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
