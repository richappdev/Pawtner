"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      setMessage("同步失敗，請查看 Edge Function 與同步紀錄。");
      return;
    }
    setMessage(dryRun ? "乾跑完成。" : "同步完成。");
    router.refresh();
  }

  return (
    <Card className="mt-8 max-w-5xl">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="eyebrow">MOA GOVERNMENT DATA</p>
          <h2 className="display mt-2 text-2xl">政府動物認領養同步</h2>
          <p className="mt-2 text-sm text-muted">
            上次成功：{lastSuccessfulSyncAt ? new Date(lastSuccessfulSyncAt).toLocaleString("zh-TW") : "尚未同步"}
            {" · "}筆數：{recordCount ?? "—"}{" · "}最近狀態：{lastStatus ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={pending} onClick={() => void sync(true)}>乾跑</Button>
          <Button disabled={pending} onClick={() => void sync(false)}>{pending ? "同步中…" : "立即同步"}</Button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm font-bold text-muted">{message}</p> : null}
    </Card>
  );
}
