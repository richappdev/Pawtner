import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";

export default function FosterMorePage() {
  return (
    <PageShell eyebrow="SETTINGS" title="中途設定" description="帳號、公開資訊與合作規範會在這裡集中管理。" width="lg" role="foster">
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          ["帳號與通知", "通知偏好功能尚未啟用", "/me"],
          ["公開資料", "由合作團隊驗證與管理", "/foster"],
          ["中途合作條款", "了解合作與資料責任", "/legal/foster-terms"],
          ["資料保存政策", "了解資料保存方式", "/legal/retention"],
        ].map(([title, description, href]) => (
          <Link key={title} href={href}>
            <Card interactive className="h-full">
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
