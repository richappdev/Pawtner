import Link from "next/link";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { localizedPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedPageMetadata("productsTitle", "/products"); }

export default function ProductsPage() {
  const t = useTranslations("Public");
  const categories = [[t("foodCategory"), t("foodDescription")], [t("cleanCategory"), t("cleanDescription")], [t("medicalCategory"), t("medicalDescription")]] as const;
  return (
    <main className="min-h-screen">
      <header className="border-b bg-surface px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
          <Link href="/foster/materials" className="text-sm font-bold text-accent">{t("backToMaterials")}</Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-7 sm:py-16">
        <p className="eyebrow">{t("productsEyebrow")}</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">{t("productsTitle")}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">{t("productsDescription")}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(([name, description], index) => (
            <Card key={name} tone={index === 1 ? "mint" : "surface"} className="min-h-56">
              <p className="latin-display text-3xl text-clay">0{index + 1}</p>
              <h2 className="display mt-8 text-2xl">{name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
              <p className="mt-7 text-sm font-bold text-accent">{t("itemsPreparing")}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
