"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";

export function PetCreateForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    const age = String(formData.get("ageMonths") ?? "").trim();
    const weight = String(formData.get("weightKg") ?? "").trim();
    const response = await fetch("/api/foster/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name")),
        species: String(formData.get("species")),
        breed: String(formData.get("breed") ?? "") || undefined,
        sex: String(formData.get("sex") ?? "unknown"),
        ageMonths: age ? Number(age) : undefined,
        weightKg: weight ? Number(weight) : undefined,
        region: String(formData.get("region")),
        personalitySummary: String(formData.get("personalitySummary")),
        specialCare: String(formData.get("specialCare") ?? "") || undefined,
        adoptionConditions: String(formData.get("adoptionConditions")),
        sterilized: formData.get("sterilized") === "on",
        microchipped: formData.get("microchipped") === "on",
        vaccinated: formData.get("vaccinated") === "on",
        dewormed: formData.get("dewormed") === "on",
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    setPending(false);
    if (!response.ok) {
      setMessage(payload?.error?.message ?? "目前無法建立毛孩資料，請確認欄位後再試一次。");
      return;
    }
    router.push("/foster/pets");
    router.refresh();
  }

  return (
    <form action={submit} className="mt-8 space-y-6">
      {message ? <Alert title="尚未儲存" tone="danger">{message}</Alert> : null}
      <Card>
        <p className="eyebrow">BASIC RECORD</p>
        <h2 className="display mt-2 text-2xl">基本資料</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="field-label">名字<Input name="name" required maxLength={100} className="mt-2" /></label>
          <label className="field-label">物種<Select name="species" className="mt-2"><option value="dog">犬</option><option value="cat">貓</option><option value="other">其他</option></Select></label>
          <label className="field-label">品種<Input name="breed" maxLength={100} className="mt-2" placeholder="不確定可留白" /></label>
          <label className="field-label">性別<Select name="sex" className="mt-2"><option value="unknown">待確認</option><option value="female">女生</option><option value="male">男生</option></Select></label>
          <label className="field-label">年齡（月）<Input name="ageMonths" type="number" min={0} max={600} className="mt-2" /></label>
          <label className="field-label">體重（kg）<Input name="weightKg" type="number" min={0.1} max={200} step="0.1" className="mt-2" /></label>
          <label className="field-label sm:col-span-2">所在縣市<Input name="region" required maxLength={80} className="mt-2" /></label>
        </div>
      </Card>

      <Card>
        <p className="eyebrow">DAILY LIFE</p>
        <h2 className="display mt-2 text-2xl">日常與適合的家</h2>
        <div className="mt-5 space-y-5">
          <label className="field-label">個性與可觀察行為<Textarea name="personalitySummary" required maxLength={5000} className="mt-2" placeholder="描述實際觀察到的作息、互動與反應" /></label>
          <label className="field-label">特別照護<Textarea name="specialCare" maxLength={5000} className="mt-2" placeholder="藥物、飲食、復健或環境需求；沒有可留白" /></label>
          <label className="field-label">適合的家庭與領養條件<Textarea name="adoptionConditions" required maxLength={5000} className="mt-2" placeholder="使用可討論、可理解的生活條件描述" /></label>
        </div>
      </Card>

      <Card tone="mint">
        <h2 className="display text-2xl">基本健康狀態</h2>
        <p className="mt-2 text-sm leading-6 text-muted">勾選已確認完成的項目；不確定時請先保留，之後再補充。</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["sterilized", "已完成絕育"],
            ["microchipped", "已植入晶片"],
            ["vaccinated", "已施打疫苗"],
            ["dewormed", "已完成驅蟲"],
          ].map(([name, label]) => (
            <label key={name} className="flex min-h-11 items-center gap-3 rounded-xl bg-surface px-4 text-sm font-bold">
              <input name={name} type="checkbox" className="h-5 w-5 accent-[var(--forest)]" />{label}
            </label>
          ))}
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="quiet" onClick={() => router.back()}>取消</Button>
        <Button type="submit" disabled={pending}>{pending ? "建立資料中…" : "儲存為草稿"}</Button>
      </div>
    </form>
  );
}
