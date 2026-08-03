import { notFound, redirect } from "next/navigation";
import { ApplicationWorkbench } from "@/components/adoption/application-workbench";
import { PageShell } from "@/components/page-shell";
import { getSessionActor } from "@/lib/auth/session-actor";
import { getFlag } from "@/lib/feature-flags";
import { noIndexRobots, pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Applications", description: "Your adoption applications and follow-ups.", path: "/applications", robots: noIndexRobots });
export default async function ApplicationsPage() { if (!await getSessionActor()) redirect("/login"); if (!getFlag("closed_pilot_adoption_operations")) notFound(); return <PageShell eyebrow="APPLICATIONS" title="Your applications" description="Track public status history, withdraw before trial, and complete due follow-ups." width="lg"><ApplicationWorkbench endpoint="/api/applications" basePath="/applications" /></PageShell>; }
