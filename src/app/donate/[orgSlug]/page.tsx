import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
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
    <main className="mx-auto min-h-screen w-full max-w-lg px-5 py-12">
      <Badge>合法公益勸募導流</Badge>
      <h1 className="display mt-4 text-4xl">{organization.name}</h1>
      {organization.description && (
        <p className="mt-4 leading-7 text-muted">{organization.description}</p>
      )}
      <dl className="mt-8 space-y-5 border-y py-6 text-sm">
        <div>
          <dt className="text-muted">公益專案</dt>
          <dd className="mt-1 font-semibold">{authorization.project_name}</dd>
        </div>
        <div>
          <dt className="text-muted">勸募許可字號</dt>
          <dd className="mt-1 font-semibold">{authorization.permit_number}</dd>
        </div>
        <div>
          <dt className="text-muted">許可期間</dt>
          <dd className="mt-1 font-semibold">
            {authorization.valid_from} 至 {authorization.valid_to}
          </dd>
        </div>
      </dl>
      <p className="mt-6 leading-7 text-muted">
        Pawtner 不經手捐款。下方連結將前往合作團體的外部捐款頁面。
      </p>
      <a
        href={authorization.lookup_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block text-center text-sm font-semibold text-accent underline"
      >
        查驗勸募許可
      </a>
      <a
        href={authorization.donation_page_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 block rounded-full bg-accent px-5 py-3 text-center font-semibold text-white"
      >
        前往合作團體捐款頁面
      </a>
    </main>
  );
}
