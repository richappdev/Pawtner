"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function PetSubmitButton({ petId }: { petId: string }) {
  const router = useRouter();
  const t = useTranslations("SharedPet");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  async function submit() {
    setPending(true);
    const response = await fetch(`/api/foster/pets/${petId}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    setPending(false);
    setMessage(response.ok ? t("submitted") : payload?.error?.message ?? t("submitFailed"));
    if (response.ok) router.refresh();
  }
  return <div><Button type="button" variant="secondary" disabled={pending} onClick={() => void submit()}>{pending ? t("submitting") : t("submit")}</Button>{message ? <p className="mt-2 text-xs text-muted">{message}</p> : null}</div>;
}
