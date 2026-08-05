import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PetCollections } from "@/components/adoption/pet-collections";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
import { noIndexRobots, localizedPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedPageMetadata("favoritesTitle", "/favorites", { descriptionKey: "favoritesDescription", robots: noIndexRobots }); }
export default async function FavoritesPage() { if (!await getSessionActor()) redirect("/login"); if (!getFlag("closed_pilot_adoption_operations")) notFound(); const t = await getTranslations("Adopter"); return <PageShell eyebrow={t("favoritesEyebrow")} title={t("favoritesTitle")} description={t("favoritesDescription")} width="xl"><PetCollections mode="favorites" /></PageShell>; }
