import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type { AdminDashboardStats } from "@/lib/admin/dashboard-stats";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/zh-TW.json";

function renderDashboard() {
  return renderToStaticMarkup(<NextIntlClientProvider locale="zh-TW" messages={messages}><AdminDashboard stats={stats} /></NextIntlClientProvider>);
}

const stats: AdminDashboardStats = {
  actionRequired: [
    {
      key: "private-pets-pending-review",
      label: "中途寵物待審核",
      value: 1234,
      href: "/admin/pets?source=private_foster",
      tone: "warning",
    },
    {
      key: "blocked-government-pets",
      label: "政府資料品質阻擋",
      value: null,
      href: "/admin/pets?source=government&qualityStatus=blocked",
      tone: "danger",
      error: true,
    },
  ],
  platformHealth: [
    {
      key: "completed-adoptions",
      label: "已完成領養",
      value: 0,
      href: "/admin/applications",
      tone: "success",
    },
  ],
  updatedAt: "2026-07-30T04:00:00.000Z",
  hasErrors: true,
};

describe("AdminDashboard", () => {
  it("renders formatted counts, zeroes, links, headings, and partial errors", () => {
    const markup = renderDashboard();

    expect(markup).toContain("需要處理");
    expect(markup).toContain("平台概況");
    expect(markup).toContain("1,234");
    expect(markup).toContain(">0<");
    expect(markup).toContain("—");
    expect(markup).toContain("部分統計資料暫時無法取得");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('href="/admin/pets?source=government&amp;qualityStatus=blocked"');
    expect(markup).toContain('aria-label="中途寵物待審核：1,234"');
  });

  it("uses responsive one, two, and four-column grids", () => {
    const markup = renderDashboard();

    expect(markup).toContain("grid gap-4 sm:grid-cols-2 xl:grid-cols-4");
  });
});
