import { notFound } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getActiveDonationDestination } from "@/lib/donations/active";
import { createServiceClient } from "@/lib/supabase/server";

export default async function DonateRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const result = await getActiveDonationDestination(createServiceClient(), orgSlug).catch(() => null);
  if (!result || result.error || !result.data) notFound();
  const { organization, authorization } = result.data;

  return (
    <main className="min-h-screen bg-[var(--pending-bg)]/35 px-5 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
        <Card className="mt-10 overflow-hidden p-0">
          <div className="bg-clay px-6 py-8 text-white sm:px-10">
            <Badge variant="warm">合法勸募資料已確認</Badge>
            <h1 className="display mt-4 text-4xl">{organization.name}</h1>
            {organization.description ? <p className="mt-4 max-w-xl leading-7 text-white/85">{organization.description}</p> : null}
          </div>
          <div className="p-6 sm:p-10">
            <p className="eyebrow">DONATION RECORD</p>
            <dl className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
              <div><dt className="data-label">勸募專案</dt><dd className="mt-1 font-bold">{authorization.project_name}</dd></div>
              <div><dt className="data-label">勸募許可字號</dt><dd className="mt-1 font-bold">{authorization.permit_number}</dd></div>
              <div className="sm:col-span-2"><dt className="data-label">許可期間</dt><dd className="mt-1 font-bold">{authorization.valid_from} – {authorization.valid_to}</dd></div>
            </dl>
            <p className="mt-7 border-t pt-6 text-sm leading-7 text-muted">Pawtner 只提供已確認勸募資訊的導流，不在本站代收款項。付款前請再次核對外部頁面的組織名稱與專案資訊。</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href={authorization.donation_page_url} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "warm", className: "flex-1" })}>前往組織官方捐款頁</a>
              <a href={authorization.lookup_url} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary" })}>查驗勸募許可</a>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
