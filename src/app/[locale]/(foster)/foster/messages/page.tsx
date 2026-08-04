import { EmptyState, PageShell } from "@/components/page-shell";
import { getTranslations } from "next-intl/server";

export default async function FosterMessagesPage() {
  const t = await getTranslations("Foster");
  return (
    <PageShell eyebrow="MESSAGES" title={t("messagesTitle")} description={t("messagesDescription")} width="lg" role="foster">
      <EmptyState title={t("messagesUnavailable")} description={t("messagesUnavailableDescription")} action={{ href: "/foster", label: t("backOverview") }} />
    </PageShell>
  );
}
