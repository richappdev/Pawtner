import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  PetViewAnalytics,
  TrackedLeadAnchor,
} from "@/components/adoption-analytics";
import { ApplicationSubmitButton } from "@/components/adoption/application-submit-button";
import { JsonLd } from "@/components/json-ld";
import { MediaGallery } from "@/components/pet-media";
import { ProcessStepper } from "@/components/process-stepper";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VerificationRow } from "@/components/verification-row";
import { getPublicPet } from "@/lib/pets/public-data";
import { getFlag } from "@/lib/feature-flags";
import type { PublicPetDetail } from "@/lib/pets/public-types";
import { formatAge, PET_STATUS_PRESENTATION, SEX_LABELS } from "@/lib/pets/presentation";
import { absoluteUrl, pageMetadata, truncateDescription } from "@/lib/seo";
import { isAppLocale } from "@/i18n/routing";

function petMetaLine(pet: PublicPetDetail): string {
  return [
    pet.sex ? SEX_LABELS[pet.sex] : null,
    pet.ageMonths ? formatAge(pet.ageMonths) : pet.ageBand,
    pet.breed,
    pet.region,
  ].filter(Boolean).join(" · ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale: rawLocale } = await params;
  const locale = isAppLocale(rawLocale) ? rawLocale : "zh-TW";
  const [t, enumT] = await Promise.all([
    getTranslations({ locale, namespace: "PetDetail" }),
    getTranslations({ locale, namespace: "Enums" }),
  ]);
  const pet = await getPublicPet(id).catch(() => null);
  if (!pet) {
    return pageMetadata({
      locale,
      title: t("notFoundTitle"),
      description: t("notFoundDescription"),
      path: `/pets/${id}`,
      robots: { index: false, follow: false },
    });
  }

  const titleBits = [enumT(pet.species), pet.region].filter(Boolean).join(" · ");
  const cover = pet.coverMedia?.url;

  return pageMetadata({
    locale,
    title: `${t("adoptionTitle", { name: pet.name })}${titleBits ? `｜${titleBits}` : ""}`,
    description: pet.personalitySummary ? truncateDescription(pet.personalitySummary) : t("adoptionTitle", { name: pet.name }),
    path: `/pets/${id}`,
    image: cover,
  });
}

export default async function PetPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale: rawLocale } = await params;
  const locale = isAppLocale(rawLocale) ? rawLocale : "zh-TW";
  const [t, enums] = await Promise.all([
    getTranslations({ locale, namespace: "PetDetail" }),
    getTranslations({ locale, namespace: "Enums" }),
  ]);
  const enumLabel = enums as unknown as (key: string) => string;
  const statusDescription = t as unknown as (key: string) => string;
  const steps = [t("stepApply"), t("stepReview"), t("stepMeet"), t("stepTrial")];
  const booleanLabel = (value: boolean | null) => value === null ? t("notProvided") : value ? t("yes") : t("no");
  const pet = await getPublicPet(id).catch(() => null);
  if (!pet) notFound();
  const status = PET_STATUS_PRESENTATION[pet.status];
  const shelterAction = pet.adoptionAction.kind === "shelter_contact" ? pet.adoptionAction : null;
  const government = shelterAction !== null;
  const adoptionOperationsEnabled = getFlag("closed_pilot_adoption_operations");
  const processIndex = pet.status === "trial_adoption" ? 3
    : pet.status === "reserved" ? 2
      : pet.status === "application_pending" ? 1 : 0;
  const pageUrl = absoluteUrl(`/${locale}/pets/${id}`);
  const cover = pet.coverMedia?.url;
  const description = pet.personalitySummary ?? t("adoptionTitle", { name: pet.name });
  const analyticsPet = {
    species: pet.species,
    sourceType: pet.sourceType,
    status: pet.status,
    regionPresent: Boolean(pet.region),
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-7 sm:px-7 sm:py-10">
      <PetViewAnalytics pet={analyticsPet} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: pet.name,
              description,
              url: pageUrl,
              about: {
                "@type": "Thing",
                name: pet.name,
                description,
                ...(cover ? { image: cover } : {}),
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: t("back"),
                  item: absoluteUrl(`/${locale}/explore`),
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: pet.name,
                  item: pageUrl,
                },
              ],
            },
          ],
        }}
      />
      <Link href="/explore" className="text-sm font-bold text-accent">← {t("back")}</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
        <MediaGallery media={pet.media} name={pet.name} />
        <section>
          <div className="flex flex-wrap gap-2">
            <Badge variant={status.variant} icon={<span aria-hidden="true">{status.icon}</span>}>
              {enumLabel(pet.status)}
            </Badge>
            <Badge>{enumLabel(pet.species)}</Badge>
            <Badge variant={government ? "pending" : "neutral"}>
              {government ? t("governmentSource") : t("fosterSource")}
            </Badge>
          </div>
          <h1 className="display mt-4 text-5xl sm:text-6xl">{pet.name}</h1>
          <p className="mt-3 text-lg text-muted">{petMetaLine(pet)}</p>

          <div className="mt-6">
            {government ? (
              <div>
                <p className="font-bold">{pet.shelter?.name ?? pet.source?.label}</p>
                <p className="mt-1 text-sm text-muted">{pet.freshnessText}</p>
              </div>
            ) : (
              <VerificationRow
                name={pet.organization?.name ?? pet.fosterDisplayName}
                verified={pet.organization?.isVerified ?? false}
              />
            )}
          </div>

          <p className="mt-7 text-lg leading-8">
            {pet.personalitySummary ?? (government
              ? t("governmentPersonalityMissing")
              : t("fosterPersonalityMissing"))}
          </p>

          {government ? (
            <Card tone="warm" className="mt-7">
              <p className="eyebrow">{t("officialShelter")}</p>
              <h2 className="display mt-2 text-2xl">{t("contactShelter")}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div><dt className="font-bold">{t("phone")}</dt><dd>{pet.shelter?.phone ?? t("notProvided")}</dd></div>
                <div><dt className="font-bold">{t("address")}</dt><dd>{pet.shelter?.address ?? t("notProvided")}</dd></div>
              </dl>
              <TrackedLeadAnchor
                pet={analyticsPet}
                leadType="shelter_contact"
                href={shelterAction!.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 py-2 font-bold text-white"
              >
                {t("officialPage")}
              </TrackedLeadAnchor>
              <p className="mt-4 text-xs leading-5 text-muted">
                {t("governmentDisclaimer")}
              </p>
            </Card>
          ) : (
            <>
              <Card tone="warm" className="mt-7">
                <p className="eyebrow">{t("beforeApply")}</p>
                <p className="mt-2 font-bold">{statusDescription(`statusDescription.${pet.status}`)}</p>
              </Card>
              {adoptionOperationsEnabled ? <ApplicationSubmitButton petId={pet.id} /> : null}
            </>
          )}
        </section>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="eyebrow">{t("profileEyebrow")}</p>
          <h2 className="display mt-2 text-3xl">{t("basicInfo")}</h2>
          <dl className="mt-6 grid grid-cols-2 gap-5 text-sm sm:grid-cols-3">
            {[
              [t("weight"), pet.weightKg ? `${pet.weightKg} kg` : t("notProvided")],
              [t("bodySize"), pet.bodySize ?? t("notProvided")],
              [t("sterilized"), booleanLabel(pet.sterilized)],
              [t("microchipped"), booleanLabel(pet.microchipped)],
              [t("rabiesVaccine"), booleanLabel(pet.rabiesVaccinated)],
              [t("foundLocation"), pet.foundLocation ?? t("notProvided")],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="data-label">{label}</dt>
                <dd className="mt-1 font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <p className="eyebrow">{t("careEyebrow")}</p>
          <h2 className="display mt-2 text-3xl">{t("careTitle")}</h2>
          <p className="mt-5 leading-7 text-muted">{pet.specialCare ?? t("specialCareMissing")}</p>
          <p className="mt-4 leading-7">{pet.adoptionConditions ?? t("conditionsMissing")}</p>
        </Card>
      </div>

      {government && pet.source ? (
        <Card tone="mint" className="mt-6">
          <p className="eyebrow">{t("attribution")}</p>
          <p className="mt-2 font-bold">{pet.source.attribution}</p>
          <p className="mt-2 text-sm text-muted">
            {t("officialReference", {
              reference: pet.source.officialReference ?? t("notProvided"),
              freshness: pet.freshnessText ?? t("notProvided"),
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-accent">
            <a href={pet.source.datasetUrl} target="_blank" rel="noreferrer">{t("viewDataset")}</a>
            <a href={pet.source.licenseUrl} target="_blank" rel="noreferrer">
              {pet.source.licenseName}
            </a>
          </div>
        </Card>
      ) : (
        <section className="mt-12">
          <p className="eyebrow">{t("nextEyebrow")}</p>
          <h2 className="display mt-2 text-3xl">{t("processTitle")}</h2>
          <div className="mt-6">
            <ProcessStepper steps={steps} current={processIndex} />
          </div>
        </section>
      )}
    </main>
  );
}
