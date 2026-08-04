import { Card } from "@/components/ui/card";
import { noIndexRobots, pageMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pilot" });
  return pageMetadata({ locale, title: t("title"), description: t("metadataDescription"), path: "/pilot", robots: noIndexRobots });
}

export default async function PilotPage() {
  const t = await getTranslations("Pilot");
  const items = ["item1", "item2", "item3", "item4", "item5", "item6", "item7"] as const;
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-12 sm:px-7 sm:py-16">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl leading-7 text-muted">{t("description")}</p>
      <div className="mt-10 grid gap-4">
        {items.map((item, index) => (
          <Card key={item} tone={index % 3 === 1 ? "mint" : "surface"} className="flex items-center gap-5">
            <span className="latin-display text-3xl text-clay">{String(index + 1).padStart(2, "0")}</span>
            <span className="font-bold">{t(item)}</span>
          </Card>
        ))}
      </div>
    </main>
  );
}
