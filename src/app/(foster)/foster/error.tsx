"use client";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export default function FosterError({ reset }: { error: Error; reset: () => void }) { const t = useTranslations("Foster"); const actions = useTranslations("Actions"); return <main className="mx-auto max-w-xl px-6 py-12"><Alert title={t("workspaceUnavailable")} tone="danger"><p>{t("retryDescription")}</p><Button className="mt-3" onClick={reset}>{actions("retry")}</Button></Alert></main>; }
