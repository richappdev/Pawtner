"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PilotInvitationForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [inviteUrl, setInviteUrl] = useState<string>();

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    setInviteUrl(undefined);
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email")),
          intendedRole: String(formData.get("intendedRole")),
          expiresInDays: Number(formData.get("expiresInDays")),
        }),
      });
      const payload = (await response.json()) as {
        data?: { inviteUrl?: string };
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(payload.error?.message ?? "無法建立邀請");
      setInviteUrl(payload.data?.inviteUrl);
      setMessage("邀請已建立。連結只會顯示這一次。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "無法建立邀請");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-4">
      <Input name="email" type="email" required placeholder="pilot@example.com" />
      <select
        name="intendedRole"
        className="rounded-xl border bg-surface px-3 py-2 text-sm"
        defaultValue="adopter"
      >
        <option value="adopter">Adopter</option>
        <option value="foster">Foster applicant</option>
      </select>
      <Input name="expiresInDays" type="number" min={1} max={30} defaultValue={7} required />
      <Button type="submit" disabled={pending}>{pending ? "建立中…" : "建立邀請"}</Button>
      {message ? <p className="md:col-span-4 text-sm text-muted">{message}</p> : null}
      {inviteUrl ? (
        <output className="md:col-span-4 break-all rounded-xl bg-surface-soft p-3 text-xs">
          {inviteUrl}
        </output>
      ) : null}
    </form>
  );
}
