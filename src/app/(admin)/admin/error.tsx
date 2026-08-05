"use client";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export default function AdminError({ reset }: { error: Error; reset: () => void }) { const t = useTranslations("Admin"); const actions = useTranslations("Actions"); return <main className="mx-auto max-w-xl px-6 py-12"><Alert title={t("operationsUnavailable")} tone="danger"><p>{t("noAutomaticRetry")}</p><Button className="mt-3" onClick={reset}>{actions("retry")}</Button></Alert></main>; }
