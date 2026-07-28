"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";

export interface FosterPetFormValues {
  name?: string;
  species?: "dog" | "cat" | "other";
  breed?: string | null;
  sex?: "female" | "male" | "unknown";
  ageMonths?: number | null;
  ageBand?: "child" | "adult" | "senior" | "unknown" | null;
  bodySize?: "small" | "medium" | "large" | "unknown" | null;
  weightKg?: number | null;
  region?: string | null;
  foundLocation?: string | null;
  personalitySummary?: string | null;
  specialCare?: string | null;
  adoptionConditions?: string | null;
  sterilized?: boolean | null;
  microchipped?: boolean | null;
  vaccinated?: boolean | null;
  rabiesVaccinated?: boolean | null;
  dewormed?: boolean | null;
}

export function PetCreateForm({
  petId,
  initial = {},
}: {
  petId?: string;
  initial?: FosterPetFormValues;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    const optionalNumber = (name: string) => {
      const value = String(formData.get(name) ?? "").trim();
      return value ? Number(value) : undefined;
    };
    const response = await fetch(petId ? `/api/foster/pets/${petId}` : "/api/foster/pets", {
      method: petId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name")),
        species: String(formData.get("species")),
        breed: String(formData.get("breed") ?? "") || undefined,
        sex: String(formData.get("sex") ?? "unknown"),
        ageMonths: optionalNumber("ageMonths"),
        ageBand: String(formData.get("ageBand") ?? "") || undefined,
        bodySize: String(formData.get("bodySize") ?? "") || undefined,
        weightKg: optionalNumber("weightKg"),
        region: String(formData.get("region") ?? "") || undefined,
        foundLocation: String(formData.get("foundLocation") ?? "") || undefined,
        personalitySummary: String(formData.get("personalitySummary") ?? "") || undefined,
        specialCare: String(formData.get("specialCare") ?? "") || undefined,
        adoptionConditions: String(formData.get("adoptionConditions") ?? "") || undefined,
        sterilized: formData.get("sterilized") === "on",
        microchipped: formData.get("microchipped") === "on",
        vaccinated: formData.get("vaccinated") === "on",
        rabiesVaccinated: formData.get("rabiesVaccinated") === "on",
        dewormed: formData.get("dewormed") === "on",
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    setPending(false);
    if (!response.ok) {
      setMessage(payload?.error?.message ?? "無法儲存動物資料，請稍後再試。");
      return;
    }
    router.push("/foster/pets");
    router.refresh();
  }

  return (
    <form action={submit} className="mt-8 space-y-6">
      {message ? <Alert title="儲存失敗" tone="danger">{message}</Alert> : null}
      <Card>
        <p className="eyebrow">BASIC RECORD</p>
        <h2 className="display mt-2 text-2xl">基本資料</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="field-label">名字<Input name="name" required maxLength={100} defaultValue={initial.name ?? ""} className="mt-2" /></label>
          <label className="field-label">物種<Select name="species" defaultValue={initial.species ?? "dog"} className="mt-2"><option value="dog">狗</option><option value="cat">貓</option><option value="other">其他</option></Select></label>
          <label className="field-label">品種<Input name="breed" maxLength={100} defaultValue={initial.breed ?? ""} className="mt-2" /></label>
          <label className="field-label">性別<Select name="sex" defaultValue={initial.sex ?? "unknown"} className="mt-2"><option value="unknown">未知</option><option value="female">母</option><option value="male">公</option></Select></label>
          <label className="field-label">年齡（月）<Input name="ageMonths" type="number" min={0} max={600} defaultValue={initial.ageMonths ?? ""} className="mt-2" /></label>
          <label className="field-label">年齡階段<Select name="ageBand" defaultValue={initial.ageBand ?? "unknown"} className="mt-2"><option value="unknown">未知</option><option value="child">幼年</option><option value="adult">成年</option><option value="senior">高齡</option></Select></label>
          <label className="field-label">體型<Select name="bodySize" defaultValue={initial.bodySize ?? "unknown"} className="mt-2"><option value="unknown">未知</option><option value="small">小型</option><option value="medium">中型</option><option value="large">大型</option></Select></label>
          <label className="field-label">體重（kg）<Input name="weightKg" type="number" min={0.1} max={200} step="0.1" defaultValue={initial.weightKg ?? ""} className="mt-2" /></label>
          <label className="field-label">地區<Input name="region" maxLength={80} defaultValue={initial.region ?? ""} className="mt-2" /></label>
          <label className="field-label">發現地點<Input name="foundLocation" maxLength={500} defaultValue={initial.foundLocation ?? ""} className="mt-2" /></label>
        </div>
      </Card>

      <Card>
        <p className="eyebrow">DAILY LIFE</p>
        <h2 className="display mt-2 text-2xl">個性與照護</h2>
        <div className="mt-5 space-y-5">
          <label className="field-label">個性描述<Textarea name="personalitySummary" maxLength={5000} defaultValue={initial.personalitySummary ?? ""} className="mt-2" /></label>
          <label className="field-label">特殊照護<Textarea name="specialCare" maxLength={5000} defaultValue={initial.specialCare ?? ""} className="mt-2" /></label>
          <label className="field-label">認養條件<Textarea name="adoptionConditions" maxLength={5000} defaultValue={initial.adoptionConditions ?? ""} className="mt-2" /></label>
        </div>
      </Card>

      <Card tone="mint">
        <h2 className="display text-2xl">健康狀態</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["sterilized", "已絕育", initial.sterilized],
            ["microchipped", "已植入晶片", initial.microchipped],
            ["vaccinated", "已完成一般疫苗", initial.vaccinated],
            ["rabiesVaccinated", "已施打狂犬病疫苗", initial.rabiesVaccinated],
            ["dewormed", "已驅蟲", initial.dewormed],
          ].map(([name, label, checked]) => (
            <label key={String(name)} className="flex min-h-11 items-center gap-3 rounded-xl bg-surface px-4 text-sm font-bold">
              <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="h-5 w-5 accent-[var(--forest)]" />
              {String(label)}
            </label>
          ))}
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="quiet" onClick={() => router.back()}>取消</Button>
        <Button type="submit" disabled={pending}>{pending ? "儲存中…" : petId ? "儲存變更" : "建立動物"}</Button>
      </div>
    </form>
  );
}
