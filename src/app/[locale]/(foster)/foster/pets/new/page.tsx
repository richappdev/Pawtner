import { PetCreateForm } from "@/components/foster/pet-create-form";
import { PageShell } from "@/components/page-shell";
import { getTranslations } from "next-intl/server";

export default async function NewPetPage() {
  const t = await getTranslations("Foster");
  return (
    <PageShell
      eyebrow="NEW PET"
      title={t("newPetTitle")}
      description={t("newPetDescription")}
      width="lg"
      role="foster"
      breadcrumbs={[{ href: "/foster/pets", label: t("myPets") }]}
    >
      <PetCreateForm />
    </PageShell>
  );
}
