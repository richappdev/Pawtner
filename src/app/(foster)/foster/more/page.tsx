import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export default async function FosterMorePage() {
  const t = await getTranslations("Foster");
  return (
    <PageShell eyebrow="SETTINGS" title={t("settingsTitle")} description={t("settingsDescription")} width="lg" role="foster">
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          [t("accountNotifications"), t("notificationsUnavailable"), "/me"],
          [t("publicProfile"), t("partnerManaged"), "/foster"],
          [t("partnerTerms"), t("partnerTermsDescription"), "/legal/foster-terms"],
          [t("retentionPolicy"), t("retentionPolicyDescription"), "/legal/retention"],
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
