import { Link } from "@/i18n/navigation";

import { Alert } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

export function LegalStub({ titleKey }: { titleKey: "adoptionDeclaration" | "aiMedia" | "commerce" | "disputes" | "fosterTerms" | "retention" | "shipping" | "terms" }) {
  const t = useTranslations("Legal");
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8 sm:px-7 sm:py-12">
      <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
      <div className="mt-14 grid gap-10 md:grid-cols-[13rem_1fr]">
        <div>
          <p className="eyebrow">{t("record")}</p>
          <p className="mt-3 text-sm leading-6 text-muted">{t("recordDescription")}</p>
        </div>
        <article>
          <h1 className="display text-4xl sm:text-5xl">{t(titleKey)}</h1>
          <div className="mt-8">
            <Alert title={t("preparing")} tone="warning">
              {t("preparingDescription")}
            </Alert>
          </div>
          <section className="mt-9 border-t pt-8">
            <h2 className="display text-2xl">{t("scopeTitle")}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
              <li>{t("scopeData")}</li>
              <li>{t("scopeRights")}</li>
              <li>{t("scopeAi")}</li>
            </ul>
          </section>
          <Link href="/" className="mt-10 inline-block font-bold text-accent underline underline-offset-4">{t("backHome")}</Link>
        </article>
      </div>
    </main>
  );
}
