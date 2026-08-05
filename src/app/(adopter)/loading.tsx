import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
export default async function AdopterLoading() { const t = await getTranslations("Adopter"); return <main className="mx-auto max-w-5xl px-6 py-12"><Card className="animate-pulse">{t("loading")}</Card></main>; }
