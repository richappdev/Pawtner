import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { JsonLd } from "@/components/json-ld";
import { PetCard } from "@/components/pet-card";
import { PetListAnalytics } from "@/components/adoption-analytics";
import { PetCover } from "@/components/pet-media";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSessionActor } from "@/lib/auth/session-actor";
import { listPublicPets } from "@/lib/pets/public-data";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  localizedPageMetadata,
} from "@/lib/seo";
export async function generateMetadata() { return localizedPageMetadata("homeTitle", "/"); }

export default async function LandingPage() {
  const t = await getTranslations("Public");
  const [session, pets] = await Promise.all([
    getSessionActor(),
    listPublicPets(3).catch(() => []),
  ]);
  const showAdminPets = session ? canAccessAdmin(session.actor) : false;

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: absoluteUrl("/"),
          description: DEFAULT_DESCRIPTION,
          email: "app.developer.rich@gmail.com",
        }}
      />
      <section className="atmosphere min-h-[92vh] overflow-hidden px-5 py-6">
        <div className="mx-auto flex min-h-[calc(92vh-3rem)] max-w-7xl flex-col">
          <header className="flex items-center justify-between">
            <Link href="/" className="latin-display text-3xl font-semibold">Pawtner</Link>
            <nav aria-label={t("homeNavAria")} className="flex items-center gap-2">
              {showAdminPets ? <ButtonLink href="/admin" variant="quiet">{t("admin")}</ButtonLink> : null}
              <ButtonLink href={session ? "/explore" : "/login"} variant="secondary">
                {session ? t("enter") : t("login")}
              </ButtonLink>
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div className="max-w-2xl">
              <p className="eyebrow">{t("heroEyebrow")}</p>
              <h1 className="display mt-5 text-5xl leading-[1.08] sm:text-6xl lg:text-7xl">
                {t("heroTitle")}
                <span className="block text-accent">{t("heroAccent")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
                {t("heroDescription")}
              </p>
              <form action="/explore" className="mt-8 flex max-w-xl flex-col gap-3 rounded-[18px] bg-surface p-3 shadow-[var(--shadow-soft)] sm:flex-row">
                <label className="sr-only" htmlFor="home-search">{t("searchLabel")}</label>
                <input
                  id="home-search"
                  name="q"
                  placeholder={t("searchPlaceholder")}
                  className="min-h-12 flex-1 rounded-xl px-4 outline-none"
                />
                <button className="min-h-12 rounded-xl bg-accent px-6 font-bold text-white hover:bg-accent-deep">
                  {t("explore")}
                </button>
              </form>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-semibold">
                <Link href="/foster" className="text-accent underline underline-offset-4">{t("fosterLink")}</Link>
                <span className="text-muted">{t("trustLine")}</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -left-5 -top-5 h-36 w-36 rounded-[38%] bg-clay/80" aria-hidden="true" />
              <div className="absolute -bottom-6 -right-5 h-44 w-44 rounded-full bg-apricot/80" aria-hidden="true" />
              <PetCover
                media={pets[0]?.coverMedia ?? null}
                name={pets[0]?.name ?? t("waitingPet")}
                priority
                className="relative aspect-[4/3] rounded-[28px] border-[10px] border-surface shadow-[var(--shadow-lift)]"
              />
              <Card className="absolute -bottom-8 left-5 right-5 sm:left-auto sm:w-72">
                <p className="eyebrow">{t("lifeRecord")}</p>
                <p className="display mt-2 text-xl">{pets[0]?.name ?? t("lifeRecordFallback")}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{t("lifeRecordDescription")}</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-px overflow-hidden rounded-[24px] border bg-line md:grid-cols-3">
            {[
              ["01", t("stepOneTitle"), t("stepOneDescription")],
              ["02", t("stepTwoTitle"), t("stepTwoDescription")],
              ["03", t("stepThreeTitle"), t("stepThreeDescription")],
            ].map(([number, title, description], index) => (
              <div key={number} className={index === 1 ? "bg-mint p-7" : "bg-surface p-7"}>
                <p className="latin-display text-3xl text-clay">{number}</p>
                <h2 className="display mt-5 text-2xl">{title}</h2>
                <p className="mt-3 leading-7 text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">{t("meetEyebrow")}</p>
              <h2 className="display mt-2 text-4xl">{t("meetTitle")}</h2>
            </div>
            <ButtonLink href="/explore" variant="secondary">{t("viewAll")}</ButtonLink>
          </div>
          {pets.length ? (
            <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <PetListAnalytics listId="home_featured" resultCount={pets.length} />
              {pets.map((pet) => <PetCard key={pet.id} pet={pet} listId="home_featured" />)}
            </div>
          ) : (
            <Card tone="mint" className="mt-9">
              <h3 className="display text-2xl">{t("preparingTitle")}</h3>
              <p className="mt-3 leading-7 text-muted">{t("preparingDescription")}</p>
            </Card>
          )}
        </div>
      </section>

      <footer className="border-t bg-surface px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="latin-display text-2xl">Pawtner</p>
            <p className="mt-1 text-sm text-muted">{t("footerTagline")}</p>
            <a
              href="mailto:app.developer.rich@gmail.com"
              className="mt-2 inline-block text-sm font-semibold text-accent underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current"
            >
              app.developer.rich@gmail.com
            </a>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-semibold text-muted">
            <Link href="/legal/privacy">{t("privacy")}</Link>
            <Link href="/legal/terms">{t("terms")}</Link>
            <Link href="/legal/ai-media">{t("aiMedia")}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
