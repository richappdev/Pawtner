import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";

export function AdminStub({ titleKey }: { titleKey: "ai" | "orders" | "reports" | "settings" }) {
  const t = useTranslations("Admin");
  const navigation = useTranslations("Navigation");
  return (
    <main className="w-full p-6 md:p-10">
      <p className="eyebrow">{navigation("operations")}</p>
      <h1 className="display mt-2 text-4xl">{t(`titles.${titleKey}`)}</h1>
      <Card tone="neutral" className="mt-8 max-w-3xl">
        <p className="font-bold">{t("stubMessage")}</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          {t("stubDescription")}
        </p>
      </Card>
    </main>
  );
}
