"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { AdminPetReviewAction } from "@/lib/pets/admin-review";

const LABELS: Record<AdminPetReviewAction, string> = {
  hide: "隱藏",
  unpublish: "下架",
  archive: "封存",
  approve: "核准刊登",
};

export function AdminPetActions({
  petId,
  actions,
}: {
  petId: string;
  actions: readonly AdminPetReviewAction[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<AdminPetReviewAction | null>(null);

  async function run(action: AdminPetReviewAction) {
    setError(null);
    setActive(action);
    try {
      const response = await fetch(`/api/admin/pets/${petId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(payload.error?.message ?? "操作失敗，請稍後再試。");
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("操作失敗，請稍後再試。");
    } finally {
      setActive(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            type="button"
            variant={action === "approve" ? "primary" : "secondary"}
            disabled={pending || active !== null}
            onClick={() => void run(action)}
            className="min-h-9 px-4 text-xs"
          >
            {active === action ? "處理中…" : LABELS[action]}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
