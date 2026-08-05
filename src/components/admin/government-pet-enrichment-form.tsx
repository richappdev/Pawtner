"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { useTranslations } from "next-intl";

export function GovernmentPetEnrichmentForm({
  petId,
  initial,
}: {
  petId: string;
  initial?: {
    display_name?: string | null;
    personality_summary?: string | null;
    special_care?: string | null;
    adoption_conditions?: string | null;
    tags?: string[] | null;
  } | null;
}) {
  const t = useTranslations("Enums.tools");
  const adminMessages = useTranslations("Admin");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const value = (name: string) => String(formData.get(name) ?? "").trim() || null;
    const response = await fetch(`/api/admin/pets/${petId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: value("displayName"),
        personalitySummary: value("personalitySummary"),
        specialCare: value("specialCare"),
        adoptionConditions: value("adoptionConditions"),
        tags: String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError(t("enrichmentFailed"));
      return;
    }
    router.refresh();
  }

  return (
    <Card className="max-w-3xl">
      <p className="eyebrow">{adminMessages("staffEnrichment")}</p>
      <h2 className="display mt-2 text-2xl">{t("enrichmentTitle")}</h2>
      <p className="mt-2 text-sm text-muted">{t("enrichmentDescription")}</p>
      <form action={submit} className="mt-5 space-y-4">
        <label className="field-label">{t("displayName")}<Input name="displayName" defaultValue={initial?.display_name ?? ""} className="mt-2" /></label>
        <label className="field-label">{t("personality")}<Textarea name="personalitySummary" defaultValue={initial?.personality_summary ?? ""} className="mt-2" /></label>
        <label className="field-label">{t("specialCare")}<Textarea name="specialCare" defaultValue={initial?.special_care ?? ""} className="mt-2" /></label>
        <label className="field-label">{t("adoptionNote")}<Textarea name="adoptionConditions" defaultValue={initial?.adoption_conditions ?? ""} className="mt-2" /></label>
        <label className="field-label">{t("tags")}<Input name="tags" defaultValue={(initial?.tags ?? []).join(", ")} className="mt-2" /></label>
        <Button type="submit" disabled={pending}>{pending ? t("saving") : t("saveEnrichment")}</Button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Card>
  );
}
