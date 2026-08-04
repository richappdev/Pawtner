import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

import { AuthForm } from "@/components/auth-form";
import { Alert } from "@/components/ui/alert";
import { noIndexRobots, localizedPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) { return localizedPageMetadata((await params).locale, "signupTitle", "/signup", { robots: noIndexRobots }); }

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const t = await getTranslations("Auth");
  const values = [t("valueRealData"), t("valueResponsibleFit"), t("valueTransparentProcess"), t("valueAftercare")];
  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <Link href="/" className="latin-display text-3xl font-semibold">Pawtner</Link>
        <div className="mt-14 max-w-md">
          <p className="eyebrow">{t("pilotEyebrow")}</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">{t("signupTitle")}</h1>
          <p className="mt-4 leading-7 text-muted">{t("signupDescription")}</p>
          {invite ? (
            <AuthForm mode="signup" inviteToken={invite} />
          ) : (
            <div className="mt-8">
              <Alert title={t("inviteOnly")} tone="warning">
                {t("inviteDescription")}
              </Alert>
            </div>
          )}
        </div>
      </section>
      <aside className="hidden bg-sage/65 p-12 lg:flex lg:flex-col lg:justify-between">
        <p className="eyebrow">{t("valuesEyebrow")}</p>
        <div className="space-y-7">
          {values.map((item, index) => (
            <div key={item} className="border-b border-ink/15 pb-5">
              <span className="latin-display mr-4 text-2xl text-clay">0{index + 1}</span>
              <span className="display text-2xl">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">{t("valuesTitle")}</p>
      </aside>
    </main>
  );
}
