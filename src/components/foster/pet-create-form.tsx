"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useTranslations } from "next-intl";

export interface FosterPetFormValues {
  name?: string;
  species?: "dog" | "cat" | "other";
  breed?: string | null;
  sex?: "female" | "male" | "unknown";
  ageMonths?: number | null;
  ageBand?: "child" | "adult" | "senior" | "unknown" | null;
  bodySize?: "small" | "medium" | "large" | "unknown" | null;
  weightKg?: number | null;
  region?: string | null;
  foundLocation?: string | null;
  personalitySummary?: string | null;
  specialCare?: string | null;
  adoptionConditions?: string | null;
  sterilized?: boolean | null;
  microchipped?: boolean | null;
  vaccinated?: boolean | null;
  rabiesVaccinated?: boolean | null;
  dewormed?: boolean | null;
}

export function PetCreateForm({
  petId,
  initial = {},
}: {
  petId?: string;
  initial?: FosterPetFormValues;
}) {
  const router = useRouter();
  const t = useTranslations("PetForm");
  const enumT = useTranslations("Enums");
  const actionT = useTranslations("Actions");
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    const optionalNumber = (name: string) => {
      const value = String(formData.get(name) ?? "").trim();
      return value ? Number(value) : undefined;
    };
    const response = await fetch(petId ? `/api/foster/pets/${petId}` : "/api/foster/pets", {
      method: petId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name")),
        species: String(formData.get("species")),
        breed: String(formData.get("breed") ?? "") || undefined,
        sex: String(formData.get("sex") ?? "unknown"),
        ageMonths: optionalNumber("ageMonths"),
        ageBand: String(formData.get("ageBand") ?? "") || undefined,
        bodySize: String(formData.get("bodySize") ?? "") || undefined,
        weightKg: optionalNumber("weightKg"),
        region: String(formData.get("region") ?? "") || undefined,
        foundLocation: String(formData.get("foundLocation") ?? "") || undefined,
        personalitySummary: String(formData.get("personalitySummary") ?? "") || undefined,
        specialCare: String(formData.get("specialCare") ?? "") || undefined,
        adoptionConditions: String(formData.get("adoptionConditions") ?? "") || undefined,
        sterilized: formData.get("sterilized") === "on",
        microchipped: formData.get("microchipped") === "on",
        vaccinated: formData.get("vaccinated") === "on",
        rabiesVaccinated: formData.get("rabiesVaccinated") === "on",
        dewormed: formData.get("dewormed") === "on",
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    setPending(false);
    if (!response.ok) {
      setMessage(payload?.error?.message ?? t("saveFailedDescription"));
      return;
    }
    router.push("/foster/pets");
    router.refresh();
  }

  return (
    <form action={submit} className="mt-8 space-y-6">
      {message ? <Alert title={t("saveFailed")} tone="danger">{message}</Alert> : null}
      <Card>
        <p className="eyebrow">{t("basicRecord")}</p>
        <h2 className="display mt-2 text-2xl">{t("basicInfo")}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="field-label">{t("name")}<Input name="name" required maxLength={100} defaultValue={initial.name ?? ""} className="mt-2" /></label>
          <label className="field-label">{t("species")}<Select name="species" defaultValue={initial.species ?? "dog"} className="mt-2"><option value="dog">{enumT("dog")}</option><option value="cat">{enumT("cat")}</option><option value="other">{enumT("other")}</option></Select></label>
          <label className="field-label">{t("breed")}<Input name="breed" maxLength={100} defaultValue={initial.breed ?? ""} className="mt-2" /></label>
          <label className="field-label">{t("sex")}<Select name="sex" defaultValue={initial.sex ?? "unknown"} className="mt-2"><option value="unknown">{enumT("unknown")}</option><option value="female">{enumT("female")}</option><option value="male">{enumT("male")}</option></Select></label>
          <label className="field-label">{t("ageMonths")}<Input name="ageMonths" type="number" min={0} max={600} defaultValue={initial.ageMonths ?? ""} className="mt-2" /></label>
          <label className="field-label">{t("ageBand")}<Select name="ageBand" defaultValue={initial.ageBand ?? "unknown"} className="mt-2"><option value="unknown">{enumT("unknown")}</option><option value="child">{t("child")}</option><option value="adult">{t("adult")}</option><option value="senior">{t("senior")}</option></Select></label>
          <label className="field-label">{t("bodySize")}<Select name="bodySize" defaultValue={initial.bodySize ?? "unknown"} className="mt-2"><option value="unknown">{enumT("unknown")}</option><option value="small">{t("small")}</option><option value="medium">{t("medium")}</option><option value="large">{t("large")}</option></Select></label>
          <label className="field-label">{t("weightKg")}<Input name="weightKg" type="number" min={0.1} max={200} step="0.1" defaultValue={initial.weightKg ?? ""} className="mt-2" /></label>
          <label className="field-label">{t("region")}<Input name="region" maxLength={80} defaultValue={initial.region ?? ""} className="mt-2" /></label>
          <label className="field-label">{t("foundLocation")}<Input name="foundLocation" maxLength={500} defaultValue={initial.foundLocation ?? ""} className="mt-2" /></label>
        </div>
      </Card>

      <Card>
        <p className="eyebrow">{t("dailyLife")}</p>
        <h2 className="display mt-2 text-2xl">{t("personalityCare")}</h2>
        <div className="mt-5 space-y-5">
          <label className="field-label">{t("personality")}<Textarea name="personalitySummary" maxLength={5000} defaultValue={initial.personalitySummary ?? ""} className="mt-2" /></label>
          <label className="field-label">{t("specialCare")}<Textarea name="specialCare" maxLength={5000} defaultValue={initial.specialCare ?? ""} className="mt-2" /></label>
          <label className="field-label">{t("adoptionConditions")}<Textarea name="adoptionConditions" maxLength={5000} defaultValue={initial.adoptionConditions ?? ""} className="mt-2" /></label>
        </div>
      </Card>

      <Card tone="mint">
        <h2 className="display text-2xl">{t("health")}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["sterilized", t("sterilized"), initial.sterilized],
            ["microchipped", t("microchipped"), initial.microchipped],
            ["vaccinated", t("vaccinated"), initial.vaccinated],
            ["rabiesVaccinated", t("rabiesVaccinated"), initial.rabiesVaccinated],
            ["dewormed", t("dewormed"), initial.dewormed],
          ].map(([name, label, checked]) => (
            <label key={String(name)} className="flex min-h-11 items-center gap-3 rounded-xl bg-surface px-4 text-sm font-bold">
              <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="h-5 w-5 accent-[var(--forest)]" />
              {String(label)}
            </label>
          ))}
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="quiet" onClick={() => router.back()}>{actionT("cancel")}</Button>
        <Button type="submit" disabled={pending}>{pending ? t("saving") : petId ? t("saveChanges") : t("createPet")}</Button>
      </div>
    </form>
  );
}
