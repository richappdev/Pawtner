import { Suspense } from "react";

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

export default function AdminDashboardPage() {
  return (
    <main className="w-full p-6 md:p-10">
      <p className="eyebrow">OPERATIONS</p>
      <h1 className="display mt-2 text-4xl">管理儀表板</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        從待處理工作開始，快速掌握 Pawtner 的送養、領養與平台營運狀態。
      </p>

      <div className="mt-8">
        <Suspense fallback={<AdminDashboardSkeleton />}>
          <DashboardStatistics />
        </Suspense>
      </div>
    </main>
  );
}
