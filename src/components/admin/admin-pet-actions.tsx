"use client";

import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { AdminPetReviewAction } from "@/lib/pets/admin-review";
import { useTranslations } from "next-intl";

export function AdminPetActions({
  petId,
  actions,
  sourceType = "private_foster",
}: {
  petId: string;
  actions: readonly AdminPetReviewAction[];
  sourceType?: "private_foster" | "government";
}) {
  const router = useRouter();
  const t = useTranslations("Enums.tools");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<AdminPetReviewAction | null>(null);
  const [note, setNote] = useState("");

  async function run(action: AdminPetReviewAction) {
    setError(null);
    setActive(action);
    try {
      const governmentPatch = action === "hide"
        ? { status: "hidden" }
        : action === "unpublish"
          ? { isPublished: false }
          : null;
      const response = await fetch(
        sourceType === "government" ? `/api/admin/pets/${petId}` : `/api/admin/pets/${petId}/review`,
        {
        method: sourceType === "government" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceType === "government" ? governmentPatch : { action, note: note.trim() || undefined }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(payload.error?.message ?? t("failed"));
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError(t("failed"));
    } finally {
      setActive(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {sourceType === "private_foster" ? <label className="text-xs font-semibold text-muted">
        {t("note")}
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2_000}
          className="mt-1 min-h-20 w-full rounded-xl border bg-surface px-3 py-2 text-sm text-foreground"
          placeholder={t("notePlaceholder")}
        />
      </label> : null}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            type="button"
            variant={action === "approve" ? "primary" : "secondary"}
            disabled={
              pending ||
              active !== null ||
              (action === "request_changes" && !note.trim())
            }
            onClick={() => void run(action)}
            className="min-h-9 px-4 text-xs"
          >
            {active === action ? t("processing") : t(action)}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
