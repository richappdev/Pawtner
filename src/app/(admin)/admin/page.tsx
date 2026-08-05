import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import {
  AdminDashboard,
  AdminDashboardSkeleton,
} from "@/components/admin/admin-dashboard";
import { getAdminDashboardStats } from "@/lib/admin/dashboard-stats";
import { createClient } from "@/lib/supabase/server";

async function DashboardStatistics() {
  const supabase = await createClient();
  const stats = await getAdminDashboardStats(supabase);
  return <AdminDashboard stats={stats} />;
}

export default async function AdminDashboardPage() {
  const [t, navigation] = await Promise.all([getTranslations("Admin"), getTranslations("Navigation")]);
  return (
    <main className="w-full p-6 md:p-10">
      <p className="eyebrow">{navigation("operations")}</p>
      <h1 className="display mt-2 text-4xl">{t("dashboardTitle")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        {t("dashboardDescription")}
      </p>

      <div className="mt-8">
        <Suspense fallback={<AdminDashboardSkeleton />}>
          <DashboardStatistics />
        </Suspense>
      </div>
    </main>
  );
}
