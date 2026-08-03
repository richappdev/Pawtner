import { notFound, redirect } from "next/navigation";
import { PetCollections } from "@/components/adoption/pet-collections";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
import { noIndexRobots, pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Favorites", description: "Your saved public pets.", path: "/favorites", robots: noIndexRobots });
export default async function FavoritesPage() { if (!await getSessionActor()) redirect("/login"); if (!getFlag("closed_pilot_adoption_operations")) notFound(); return <PageShell eyebrow="FAVORITES" title="Saved pets" description="Your private-foster and official shelter favorites, with source-aware next steps." width="xl"><PetCollections mode="favorites" /></PageShell>; }
