"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ApplicationSubmitButton({ petId }: { petId: string }) {
  const t = useTranslations("PetDetail");
  const router = useRouter(); const [state, setState] = useState<"idle" | "submitting" | "error">("idle"); const [message, setMessage] = useState("");
  async function submit() { setState("submitting"); const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ petId }) }); const payload = await response.json(); if (!response.ok) { if (response.status === 401) { router.push("/login"); return; } setMessage(payload.error?.message ?? t("submitFailed")); setState("error"); return; } router.push(`/applications/${payload.data.id}`); router.refresh(); }
  return <div className="mt-6">{state === "error" ? <Alert title={t("notSubmitted")} tone="danger">{message}</Alert> : null}<Button size="lg" className="mt-3 w-full" disabled={state === "submitting"} onClick={() => void submit()}>{state === "submitting" ? t("submitting") : t("applyThrough")}</Button></div>;
}
