import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export default async function FosterOverviewPage() {
  const t = await getTranslations("Foster");
  return (
    <PageShell
      eyebrow="FOSTER SPACE"
      title={t("overviewTitle")}
      description={t("overviewDescription")}
      width="lg"
      role="foster"
      headerAction={<ButtonLink href="/foster/pets/new">{t("addPet")}</ButtonLink>}
    >
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          [t("recordsNeeded"), "0", t("recordsNeededDescription")],
          [t("inReview"), "0", t("inReviewDescription")],
          [t("newApplications"), "0", t("newApplicationsDescription")],
        ].map(([title, value, description], index) => (
          <Card key={title} tone={index === 0 ? "warm" : index === 1 ? "mint" : "surface"}>
            <p className="data-label">{title}</p>
            <p className="latin-display mt-3 text-4xl">{value}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <p className="eyebrow">{t("today")}</p>
        <h2 className="display mt-2 text-2xl">{t("noUrgentTasks")}</h2>
        <p className="mt-3 leading-7 text-muted">{t("noUrgentTasksDescription")}</p>
      </Card>
    </PageShell>
  );
}
