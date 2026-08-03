import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardMetricTone = "neutral" | "warning" | "danger" | "success";

export interface DashboardMetric {
  key: string;
  label: string;
  value: number | null;
  href: string;
  tone: DashboardMetricTone;
  error?: boolean;
}

export interface AdminDashboardStats {
  actionRequired: DashboardMetric[];
  platformHealth: DashboardMetric[];
  updatedAt: string;
  hasErrors: boolean;
}

interface CountResponse {
  count: number | null;
  error: { message: string } | null;
}

interface CountResult {
  value: number | null;
  error: boolean;
}

async function readCount(query: PromiseLike<CountResponse>): Promise<CountResult> {
  try {
    const { count, error } = await query;
    if (error) return { value: null, error: true };
    return { value: count ?? 0, error: false };
  } catch {
    return { value: null, error: true };
  }
}

function metric(
  definition: Omit<DashboardMetric, "value" | "error">,
  result: CountResult,
): DashboardMetric {
  return {
    ...definition,
    value: result.value,
    error: result.error || undefined,
  };
}

export async function getAdminDashboardStats(
  supabase: SupabaseClient,
): Promise<AdminDashboardStats> {
  const [
    privatePetsPendingReview,
    governmentPetsPendingReview,
    blockedGovernmentPets,
    fosterApplicationsPending,
    newAdoptionApplications,
    ordersNeedingFulfillment,
    unresolvedReports,
    aiContentPendingReview,
    publiclyAvailablePets,
    approvedFosters,
    activeAdoptionPipeline,
    completedAdoptions,
  ] = await Promise.all([
    readCount(
      supabase
        .from("pets")
        .select("id", { count: "exact", head: true })
        .eq("source_type", "private_foster")
        .eq("review_status", "pending_review"),
    ),
    readCount(
      supabase
        .from("pet_source_records")
        .select("pet_id", { count: "exact", head: true })
        .eq("publication_status", "pending_review"),
    ),
    readCount(
      supabase
        .from("pet_source_records")
        .select("pet_id", { count: "exact", head: true })
        .eq("quality_status", "blocked"),
    ),
    readCount(
      supabase
        .from("foster_profiles")
        .select("id", { count: "exact", head: true })
        .in("status", ["submitted", "under_review"]),
    ),
    readCount(
      supabase
        .from("adoption_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
    ),
    readCount(
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["paid", "fulfilled"]),
    ),
    readCount(
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "reviewing"]),
    ),
    readCount(
      supabase
        .from("ai_generations")
        .select("id", { count: "exact", head: true })
        .eq("status", "needs_review"),
    ),
    readCount(
      supabase
        .from("pets_public")
        .select("id", { count: "exact", head: true }),
    ),
    readCount(
      supabase
        .from("foster_profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
    ),
    readCount(
      supabase
        .from("adoption_applications")
        .select("id", { count: "exact", head: true })
        .in("status", ["screening", "interview", "home_check", "trial"]),
    ),
    readCount(
      supabase
        .from("adoption_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "adopted"),
    ),
  ]);

  const actionRequired = [
    metric(
      {
        key: "private-pets-pending-review",
        label: "中途寵物待審核",
        href: "/admin/pets?source=private_foster&reviewStatus=pending_review&region=",
        tone: "warning",
      },
      privatePetsPendingReview,
    ),
    metric(
      {
        key: "government-pets-pending-review",
        label: "政府資料待發布審核",
        href: "/admin/pets?source=government&publicationStatus=pending_review",
        tone: "warning",
      },
      governmentPetsPendingReview,
    ),
    metric(
      {
        key: "blocked-government-pets",
        label: "政府資料品質阻擋",
        href: "/admin/pets?source=government&qualityStatus=blocked",
        tone: "danger",
      },
      blockedGovernmentPets,
    ),
    metric(
      {
        key: "foster-applications-pending",
        label: "中途申請待處理",
        href: "/admin/fosters",
        tone: "warning",
      },
      fosterApplicationsPending,
    ),
    metric(
      {
        key: "new-adoption-applications",
        label: "新領養申請",
        href: "/admin/applications",
        tone: "warning",
      },
      newAdoptionApplications,
    ),
    metric(
      {
        key: "orders-needing-fulfillment",
        label: "訂單待履行",
        href: "/admin/orders",
        tone: "warning",
      },
      ordersNeedingFulfillment,
    ),
    metric(
      {
        key: "unresolved-reports",
        label: "檢舉尚未結案",
        href: "/admin/reports",
        tone: "warning",
      },
      unresolvedReports,
    ),
    metric(
      {
        key: "ai-content-pending-review",
        label: "AI 內容待審核",
        href: "/admin/ai",
        tone: "warning",
      },
      aiContentPendingReview,
    ),
  ];

  const platformHealth = [
    metric(
      {
        key: "publicly-available-pets",
        label: "公開送養中的寵物",
        href: "/admin/pets?isPublished=true",
        tone: "neutral",
      },
      publiclyAvailablePets,
    ),
    metric(
      {
        key: "approved-fosters",
        label: "已核准中途",
        href: "/admin/fosters",
        tone: "neutral",
      },
      approvedFosters,
    ),
    metric(
      {
        key: "active-adoption-pipeline",
        label: "進行中的領養流程",
        href: "/admin/applications",
        tone: "neutral",
      },
      activeAdoptionPipeline,
    ),
    metric(
      {
        key: "completed-adoptions",
        label: "已完成領養",
        href: "/admin/applications",
        tone: "success",
      },
      completedAdoptions,
    ),
  ];

  return {
    actionRequired,
    platformHealth,
    updatedAt: new Date().toISOString(),
    hasErrors: [...actionRequired, ...platformHealth].some((item) => item.error),
  };
}
