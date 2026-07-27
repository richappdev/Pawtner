"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PetSubmitButton({ petId }: { petId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  async function submit() {
    setPending(true);
    const response = await fetch(`/api/foster/pets/${petId}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    setPending(false);
    setMessage(response.ok ? "已送交平台審核" : payload?.error?.message ?? "無法送審");
    if (response.ok) router.refresh();
  }
  return <div><Button type="button" variant="secondary" disabled={pending} onClick={() => void submit()}>{pending ? "送審中…" : "送交審核"}</Button>{message ? <p className="mt-2 text-xs text-muted">{message}</p> : null}</div>;
}
