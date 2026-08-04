import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export default async function FosterMaterialsPage() {
  const t = await getTranslations("Foster");
  return (
    <PageShell eyebrow="MATERIALS" title={t("materialsTitle")} description={t("materialsDescription")} width="lg" role="foster" headerAction={<ButtonLink href="/products" variant="warm">{t("browseMaterials")}</ButtonLink>}>
      <Card tone="warm" className="mt-8">
        <h2 className="display text-2xl">{t("wishlistPreparing")}</h2>
        <p className="mt-3 max-w-xl leading-7 text-muted">{t("wishlistPreparingDescription")}</p>
      </Card>
    </PageShell>
  );
}
