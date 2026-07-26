import type { PetStatus } from "@/lib/schemas/pet";

export const ADMIN_PET_REVIEW_ACTIONS = ["hide", "unpublish", "archive", "approve"] as const;
export type AdminPetReviewAction = (typeof ADMIN_PET_REVIEW_ACTIONS)[number];

export interface AdminPetReviewPatch {
  status?: PetStatus;
  is_published: boolean;
  published_at: string | null;
}

export function reviewActionToPatch(
  action: AdminPetReviewAction,
  currentStatus: PetStatus,
  now = new Date(),
): AdminPetReviewPatch {
  switch (action) {
    case "hide":
      return {
        status: "hidden",
        is_published: false,
        published_at: null,
      };
    case "unpublish":
      return {
        is_published: false,
        published_at: null,
      };
    case "archive":
      return {
        status: "archived",
        is_published: false,
        published_at: null,
      };
    case "approve": {
      const needsAvailable =
        currentStatus === "intake" ||
        currentStatus === "medical_hold" ||
        currentStatus === "hidden";
      return {
        ...(needsAvailable ? { status: "available" as const } : {}),
        is_published: true,
        published_at: now.toISOString(),
      };
    }
  }
}
