"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function GovernmentSyncPanel({
  lastSuccessfulSyncAt,
  recordCount,
  lastStatus,
}: {
  lastSuccessfulSyncAt: string | null;
  recordCount: number | null;
  lastStatus: string | null;
}) {
  const adminMessages = useTranslations("Admin");
  const t = useTranslations("Enums.tools");
  const format = useFormatter();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync(dryRun: boolean) {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/admin/pet-sources/moa/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dryRun }),
    }).catch(() => null);
    setPending(false);
    if (!response?.ok) {
      setMessage(t("syncFailed"));
      return;
    }
    setMessage(dryRun ? t("dryRunComplete") : t("syncComplete"));
    router.refresh();
  }

  return (
    <Card className="mt-8 max-w-5xl">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="eyebrow">{adminMessages("governmentData")}</p>
          <h2 className="display mt-2 text-2xl">{t("syncTitle")}</h2>
          <p className="mt-2 text-sm text-muted">
            {t("lastSuccess", { date: lastSuccessfulSyncAt ? format.dateTime(new Date(lastSuccessfulSyncAt), { dateStyle: "medium", timeStyle: "short" }) : t("never") })}
            {" · "}{t("records", { count: recordCount ?? "—" })}{" · "}{t("lastStatus", { status: lastStatus ?? "—" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={pending} onClick={() => void sync(true)}>{t("dryRun")}</Button>
          <Button disabled={pending} onClick={() => void sync(false)}>{pending ? t("syncing") : t("syncNow")}</Button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm font-bold text-muted">{message}</p> : null}
    </Card>
  );
}
