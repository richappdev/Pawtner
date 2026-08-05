import Link from "next/link";

import { PrivacySettingsButton } from "@/components/privacy-settings-button";
import { localizedLegalPageMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() { return localizedLegalPageMetadata("privacy", "/legal/privacy"); }

export default async function PrivacyPage() {
  const [t, legalT] = await Promise.all([getTranslations("Privacy"), getTranslations("Legal")]);
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8 sm:px-7 sm:py-12">
      <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
      <article className="mt-14">
        <p className="eyebrow">{legalT("privacy")}</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">{legalT("privacy")}</h1>
        <p className="mt-5 text-sm leading-7 text-muted">{t("updated")}</p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-muted">
          <section>
            <h2 className="display text-2xl text-ink">{t("collectionTitle")}</h2>
            <p className="mt-3">{t("collectionBody")}</p>
          </section>

          <section>
            <h2 className="display text-2xl text-ink">{t("excludedTitle")}</h2>
            <p className="mt-3">{t("excludedBody")}</p>
          </section>

          <section>
            <h2 className="display text-2xl text-ink">{t("purposeTitle")}</h2>
            <p className="mt-3">{t("purposeBody")}</p>
          </section>

          <section>
            <h2 className="display text-2xl text-ink">{t("choiceTitle")}</h2>
            <p className="mt-3">{t("choiceBody")}</p>
            <div className="mt-5"><PrivacySettingsButton /></div>
          </section>

          <section>
            <h2 className="display text-2xl text-ink">{t("contactTitle")}</h2>
            <p className="mt-3">
              {t("contactPrompt")} {" "}
              <a className="font-semibold text-accent underline" href="mailto:app.developer.rich@gmail.com">
                app.developer.rich@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <Link href="/" className="mt-12 inline-block font-bold text-accent underline underline-offset-4">
          {legalT("backHome")}
        </Link>
      </article>
    </main>
  );
}
