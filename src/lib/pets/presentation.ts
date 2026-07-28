import type { BadgeVariant } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/lib/schemas/application";
import type { PetStatus } from "@/lib/schemas/pet";

export interface StatusPresentation {
  label: string;
  description: string;
  variant: BadgeVariant;
  icon: string;
}

export const PET_STATUS_PRESENTATION: Record<PetStatus, StatusPresentation> = {
  intake: { label: "建立資料中", description: "資料仍在整理，尚未開放申請。", variant: "neutral", icon: "○" },
  medical_hold: { label: "醫療照護中", description: "目前以健康與照護為優先。", variant: "danger", icon: "＋" },
  available: { label: "可申請", description: "目前開放認識與申請。", variant: "success", icon: "✓" },
  application_pending: { label: "申請評估中", description: "已有申請正在依序評估。", variant: "pending", icon: "…" },
  reserved: { label: "安排見面中", description: "正在安排下一步認識。", variant: "process", icon: "↗" },
  trial_adoption: { label: "試養中", description: "正在一起適應新生活。", variant: "process", icon: "⌂" },
  adopted: { label: "已找到家", description: "這位毛孩已經找到新家。", variant: "adopted", icon: "♥" },
  hidden: { label: "暫停申請", description: "目前暫停對外申請。", variant: "neutral", icon: "–" },
  archived: { label: "已封存", description: "這份資料已封存。", variant: "neutral", icon: "□" },
};

export const APPLICATION_STATUS_PRESENTATION: Record<ApplicationStatus, StatusPresentation> = {
  draft: { label: "草稿", description: "尚未送出。", variant: "neutral", icon: "○" },
  submitted: { label: "已送出", description: "等待中途確認。", variant: "pending", icon: "✓" },
  screening: { label: "初步評估", description: "正在檢視生活條件與需求。", variant: "pending", icon: "…" },
  interview: { label: "安排訪談", description: "準備更深入地認識彼此。", variant: "process", icon: "↗" },
  home_check: { label: "居家確認", description: "確認生活環境與照護安排。", variant: "process", icon: "⌂" },
  trial: { label: "試養中", description: "正在一起適應新生活。", variant: "process", icon: "⌂" },
  approved: { label: "已核准", description: "申請已通過。", variant: "success", icon: "✓" },
  adopted: { label: "完成領養", description: "已完成領養流程。", variant: "adopted", icon: "♥" },
  rejected: { label: "本次未媒合", description: "這次條件未能適合彼此。", variant: "danger", icon: "×" },
  withdrawn: { label: "已撤回", description: "申請人已撤回申請。", variant: "neutral", icon: "–" },
  returned: { label: "結束試養", description: "試養已結束並回到照護安排。", variant: "danger", icon: "↩" },
};

export const PET_REVIEW_PRESENTATION: Record<string, StatusPresentation> = {
  draft: { label: "草稿", description: "尚未送審。", variant: "neutral", icon: "○" },
  pending_review: { label: "資料審核中", description: "合作團隊正在檢查資料。", variant: "pending", icon: "…" },
  changes_requested: { label: "待補資料", description: "請完成需要補充的內容。", variant: "danger", icon: "!" },
  approved: { label: "已驗證", description: "資料已通過審核。", variant: "success", icon: "✓" },
};

export const SPECIES_LABELS = {
  dog: "犬",
  cat: "貓",
  other: "其他",
} as const;

export const SEX_LABELS = {
  male: "男生",
  female: "女生",
  unknown: "性別待確認",
} as const;

export function formatAge(ageMonths: number | null): string {
  if (ageMonths === null) return "年齡待確認";
  if (ageMonths < 12) return `${ageMonths} 個月`;
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return months ? `${years} 歲 ${months} 個月` : `${years} 歲`;
}
