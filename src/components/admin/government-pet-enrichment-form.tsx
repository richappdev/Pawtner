"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

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
      setError("無法儲存加值內容。");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="max-w-3xl">
      <p className="eyebrow">STAFF ENRICHMENT</p>
      <h2 className="display mt-2 text-2xl">編輯 Pawtner 加值內容</h2>
      <p className="mt-2 text-sm text-muted">這些欄位不會被政府同步覆寫，且在公開頁面優先顯示。</p>
      <form action={submit} className="mt-5 space-y-4">
        <label className="field-label">顯示名稱<Input name="displayName" defaultValue={initial?.display_name ?? ""} className="mt-2" /></label>
        <label className="field-label">個性描述<Textarea name="personalitySummary" defaultValue={initial?.personality_summary ?? ""} className="mt-2" /></label>
        <label className="field-label">特殊照護<Textarea name="specialCare" defaultValue={initial?.special_care ?? ""} className="mt-2" /></label>
        <label className="field-label">認養提醒<Textarea name="adoptionConditions" defaultValue={initial?.adoption_conditions ?? ""} className="mt-2" /></label>
        <label className="field-label">標籤（逗號分隔）<Input name="tags" defaultValue={(initial?.tags ?? []).join(", ")} className="mt-2" /></label>
        <Button type="submit" disabled={pending}>{pending ? "儲存中…" : "儲存加值內容"}</Button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Card>
  );
}
