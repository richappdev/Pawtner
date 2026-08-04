import { notFound } from "next/navigation";

import { PetCreateForm } from "@/components/foster/pet-create-form";
import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function EditFosterPetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("Foster");
  const supabase = await createClient();
  const { data } = await supabase
    .from("pets")
    .select("id,name,species,breed,sex,age_months,age_band,body_size,weight_kg,region,found_location,personality_summary,special_care,adoption_conditions,sterilized,microchipped,vaccinated,rabies_vaccinated,dewormed,source_type")
    .eq("id", id)
    .eq("source_type", "private_foster")
    .maybeSingle();
  if (!data) notFound();

  return (
    <PageShell
      eyebrow="EDIT PET"
      title={t("editPetTitle", { name: data.name })}
      description={t("editPetDescription")}
      width="lg"
      role="foster"
      breadcrumbs={[{ href: "/foster/pets", label: t("myPets") }]}
    >
      <PetCreateForm
        petId={data.id}
        initial={{
          name: data.name,
          species: data.species,
          breed: data.breed,
          sex: data.sex,
          ageMonths: data.age_months,
          ageBand: data.age_band,
          bodySize: data.body_size,
          weightKg: data.weight_kg === null ? null : Number(data.weight_kg),
          region: data.region,
          foundLocation: data.found_location,
          personalitySummary: data.personality_summary,
          specialCare: data.special_care,
          adoptionConditions: data.adoption_conditions,
          sterilized: data.sterilized,
          microchipped: data.microchipped,
          vaccinated: data.vaccinated,
          rabiesVaccinated: data.rabies_vaccinated,
          dewormed: data.dewormed,
        }}
      />
    </PageShell>
  );
}
