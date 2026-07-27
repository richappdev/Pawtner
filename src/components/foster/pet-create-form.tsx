"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PetCreateForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    const response = await fetch("/api/foster/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name")),
        species: String(formData.get("species")),
        region: String(formData.get("region")),
        personalitySummary: String(formData.get("personalitySummary")),
        adoptionConditions: String(formData.get("adoptionConditions")),
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    setPending(false);
    if (!response.ok) return setMessage(payload?.error?.message ?? "無法建立毛孩資料");
    router.push("/foster/pets");
    router.refresh();
  }

  return (
    <form action={submit} className="mt-8 space-y-4">
      <label className="block text-sm font-semibold">名稱<Input name="name" required maxLength={100} className="mt-2" /></label>
      <label className="block text-sm font-semibold">物種<select name="species" className="mt-2 w-full rounded-xl border border-[#d7e4e0] bg-white px-3 py-2"><option value="dog">犬</option><option value="cat">貓</option><option value="other">其他</option></select></label>
      <label className="block text-sm font-semibold">地區<Input name="region" required maxLength={80} className="mt-2" /></label>
      <label className="block text-sm font-semibold">個性摘要<textarea name="personalitySummary" required maxLength={5000} className="mt-2 min-h-28 w-full rounded-xl border border-[#d7e4e0] bg-white px-3 py-2" /></label>
      <label className="block text-sm font-semibold">領養條件<textarea name="adoptionConditions" required maxLength={5000} className="mt-2 min-h-28 w-full rounded-xl border border-[#d7e4e0] bg-white px-3 py-2" /></label>
      {message ? <p role="status" className="text-sm text-red-700">{message}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">{pending ? "儲存中…" : "建立草稿"}</Button>
    </form>
  );
}
