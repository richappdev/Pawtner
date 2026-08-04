import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getActiveDonationDestination } from "@/lib/donations/active";
import { pageMetadata, truncateDescription } from "@/lib/seo";
import { createServiceClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale; orgSlug: string }>;
}): Promise<Metadata> {
  const { locale, orgSlug } = await params;
  const t = await getTranslations({ locale, namespace: "Donation" });
  const result = await getActiveDonationDestination(createServiceClient(), orgSlug).catch(() => null);
  if (!result?.data) {
    return pageMetadata({
      locale,
      title: t("metadataTitle"),
      description: t("metadataDescription"),
      path: `/donate/${orgSlug}`,
      robots: { index: false, follow: false },
    });
  }

  const { organization, authorization } = result.data;
  return pageMetadata({
    locale,
    title: `${organization.name}｜${t("titleSuffix")}`,
    description: truncateDescription(
      organization.description
        ?? t("authoredFallback", { name: organization.name, project: authorization.project_name }),
    ),
    path: `/donate/${orgSlug}`,
  });
}

export default async function DonateRedirectPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const t = await getTranslations("Donation");
  const result = await getActiveDonationDestination(createServiceClient(), orgSlug).catch(() => null);
  if (!result || result.error || !result.data) notFound();
  const { organization, authorization } = result.data;

  return (
    <main className="min-h-screen bg-[var(--pending-bg)]/35 px-5 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
        <Card className="mt-10 overflow-hidden p-0">
          <div className="bg-clay px-6 py-8 text-white sm:px-10">
            <Badge variant="warm">{t("verified")}</Badge>
            <h1 className="display mt-4 text-4xl">{organization.name}</h1>
            {organization.description ? <p className="mt-4 max-w-xl leading-7 text-white/85">{organization.description}</p> : null}
          </div>
          <div className="p-6 sm:p-10">
            <p className="eyebrow">{t("record")}</p>
            <dl className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
              <div><dt className="data-label">{t("project")}</dt><dd className="mt-1 font-bold">{authorization.project_name}</dd></div>
              <div><dt className="data-label">{t("permit")}</dt><dd className="mt-1 font-bold">{authorization.permit_number}</dd></div>
              <div className="sm:col-span-2"><dt className="data-label">{t("period")}</dt><dd className="mt-1 font-bold">{authorization.valid_from} – {authorization.valid_to}</dd></div>
            </dl>
            <p className="mt-7 border-t pt-6 text-sm leading-7 text-muted">{t("disclaimer")}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href={authorization.donation_page_url} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "warm", className: "flex-1" })}>{t("openOfficial")}</a>
              <a href={authorization.lookup_url} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary" })}>{t("verifyPermit")}</a>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
