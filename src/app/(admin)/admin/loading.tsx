import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
export default async function AdminLoading() { const t = await getTranslations("Admin"); return <main className="mx-auto max-w-6xl px-6 py-12"><Card className="animate-pulse">{t("loadingQueue")}</Card></main>; }
