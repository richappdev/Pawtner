"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { PetSourcePublicationStatus, PetSourceQualityStatus } from "@/lib/schemas/pet";
import { useTranslations } from "next-intl";

type PublicationAction = "approve" | "publish" | "hold" | "unpublish";

function availableActions(status: PetSourcePublicationStatus): PublicationAction[] {
  if (status === "approved") return ["publish", "hold"];
  if (status === "published") return ["unpublish"];
  return ["approve", "hold"];
}

export function GovernmentPublicationActions({
  petId,
  publicationStatus,
  qualityStatus,
}: {
  petId: string;
  publicationStatus: PetSourcePublicationStatus;
  qualityStatus: PetSourceQualityStatus;
}) {
  const router = useRouter();
  const t = useTranslations("Enums.tools");
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<PublicationAction | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const actions = availableActions(publicationStatus);

  async function run(action: PublicationAction) {
    setActive(action);
    setError(null);
    try {
      const response = await fetch(`/api/admin/pets/${petId}/government-publication`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) {
        setError(payload.error?.message ?? t("publicationFailed"));
        return;
      }
      setReason("");
      startTransition(() => router.refresh());
    } catch {
      setError(t("publicationFailed"));
    } finally {
      setActive(null);
    }
  }

  return (
    <div className="space-y-2">
      {actions.some((action) => action === "hold" || action === "unpublish") ? (
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={2_000}
          placeholder={t("publicationReason")}
          className="min-h-9 w-full min-w-44 rounded-xl border bg-surface px-3 py-2 text-xs"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const requiresReason = action === "hold" || action === "unpublish";
          return (
            <Button
              key={action}
              type="button"
              variant={action === "publish" ? "primary" : "secondary"}
              className="min-h-9 px-3 text-xs"
              disabled={
                pending ||
                active !== null ||
                (requiresReason && !reason.trim()) ||
                (action === "approve" && qualityStatus === "blocked")
              }
              onClick={() => void run(action)}
            >
              {active === action ? t("processing") : action === "approve" ? t("approveData") : t(action)}
            </Button>
          );
        })}
      </div>
      {qualityStatus === "blocked" ? (
        <p className="text-xs text-red-700">{t("blocked")}</p>
      ) : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
