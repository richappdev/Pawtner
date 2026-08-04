import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PetCollections } from "@/components/adoption/pet-collections";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
import { noIndexRobots, localizedPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";
export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) { return localizedPageMetadata((await params).locale, "favoritesTitle", "/favorites", { descriptionKey: "favoritesDescription", robots: noIndexRobots }); }
export default async function FavoritesPage() { if (!await getSessionActor()) redirect("/login"); if (!getFlag("closed_pilot_adoption_operations")) notFound(); const t = await getTranslations("Adopter"); return <PageShell eyebrow={t("favoritesEyebrow")} title={t("favoritesTitle")} description={t("favoritesDescription")} width="xl"><PetCollections mode="favorites" /></PageShell>; }
