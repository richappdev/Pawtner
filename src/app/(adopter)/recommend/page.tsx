import { notFound, redirect } from "next/navigation";
import { PetCollections } from "@/components/adoption/pet-collections";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
import { noIndexRobots, pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Recommendations", description: "Explainable pet recommendations.", path: "/recommend", robots: noIndexRobots });
export default async function RecommendPage() { if (!await getSessionActor()) redirect("/login"); if (!getFlag("closed_pilot_adoption_operations")) notFound(); return <PageShell eyebrow="RECOMMEND" title="Evidence-based matches" description="Scores use only structured pet requirements and traits. Missing evidence stays visible and never becomes a perfect score." width="xl"><PetCollections mode="recommendations" /></PageShell>; }
