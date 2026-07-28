import Link from "next/link";
import { notFound } from "next/navigation";

import { MediaGallery } from "@/components/pet-media";
import { ProcessStepper } from "@/components/process-stepper";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VerificationRow } from "@/components/verification-row";
import { getPublicPet } from "@/lib/pets/public-data";
import { formatAge, PET_STATUS_PRESENTATION, SEX_LABELS, SPECIES_LABELS } from "@/lib/pets/presentation";

const STEPS = ["提出申請", "中途審核", "見面互動", "試養追蹤"] as const;

function booleanLabel(value: boolean | null) {
  if (value === null) return "未提供";
  return value ? "是" : "否";
}

export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pet = await getPublicPet(id).catch(() => null);
  if (!pet) notFound();
  const status = PET_STATUS_PRESENTATION[pet.status];
  const shelterAction = pet.adoptionAction.kind === "shelter_contact" ? pet.adoptionAction : null;
  const government = shelterAction !== null;
  const processIndex = pet.status === "trial_adoption" ? 3
    : pet.status === "reserved" ? 2
      : pet.status === "application_pending" ? 1 : 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-7 sm:px-7 sm:py-10">
      <Link href="/explore" className="text-sm font-bold text-accent">← 返回探索</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
        <MediaGallery media={pet.media} name={pet.name} />
        <section>
          <div className="flex flex-wrap gap-2">
            <Badge variant={status.variant} icon={<span aria-hidden="true">{status.icon}</span>}>
              {status.label}
            </Badge>
            <Badge>{SPECIES_LABELS[pet.species]}</Badge>
            <Badge variant={government ? "pending" : "neutral"}>
              {government ? "政府開放資料" : "Pawtner 中途"}
            </Badge>
          </div>
          <h1 className="display mt-4 text-5xl sm:text-6xl">{pet.name}</h1>
          <p className="mt-3 text-lg text-muted">
            {[
              pet.sex ? SEX_LABELS[pet.sex] : null,
              pet.ageMonths ? formatAge(pet.ageMonths) : pet.ageBand,
              pet.breed,
              pet.region,
            ].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-6">
            {government ? (
              <div>
                <p className="font-bold">{pet.shelter?.name ?? pet.source?.label}</p>
                <p className="mt-1 text-sm text-muted">{pet.freshnessText}</p>
              </div>
            ) : (
              <VerificationRow
                name={pet.organization?.name ?? pet.fosterDisplayName}
                verified={pet.organization?.isVerified ?? false}
              />
            )}
          </div>

          <p className="mt-7 text-lg leading-8">
            {pet.personalitySummary ?? (government
              ? "本筆資料未提供個性描述，請向收容所確認最新狀況。"
              : "中途家庭尚未補上個性描述。")}
          </p>

          {government ? (
            <Card tone="warm" className="mt-7">
              <p className="eyebrow">OFFICIAL SHELTER</p>
              <h2 className="display mt-2 text-2xl">請直接聯絡官方收容所</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div><dt className="font-bold">電話</dt><dd>{pet.shelter?.phone ?? "未提供"}</dd></div>
                <div><dt className="font-bold">地址</dt><dd>{pet.shelter?.address ?? "未提供"}</dd></div>
              </dl>
              <a
                href={shelterAction!.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 py-2 font-bold text-white"
              >
                前往官方認養頁
              </a>
              <p className="mt-4 text-xs leading-5 text-muted">
                Pawtner 僅呈現開放資料，不受理此動物的認養申請，也不代表政府背書。
              </p>
            </Card>
          ) : (
            <>
              <Card tone="warm" className="mt-7">
                <p className="eyebrow">BEFORE YOU APPLY</p>
                <p className="mt-2 font-bold">{status.description}</p>
              </Card>
              <ButtonLink href="/login" size="lg" className="mt-6 w-full">登入並提出認養申請</ButtonLink>
            </>
          )}
        </section>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="eyebrow">PET PROFILE</p>
          <h2 className="display mt-2 text-3xl">基本資料</h2>
          <dl className="mt-6 grid grid-cols-2 gap-5 text-sm sm:grid-cols-3">
            {[
              ["體重", pet.weightKg ? `${pet.weightKg} kg` : "未提供"],
              ["體型", pet.bodySize ?? "未提供"],
              ["絕育", booleanLabel(pet.sterilized)],
              ["晶片", booleanLabel(pet.microchipped)],
              ["狂犬病疫苗", booleanLabel(pet.rabiesVaccinated)],
              ["發現地點", pet.foundLocation ?? "未提供"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="data-label">{label}</dt>
                <dd className="mt-1 font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <p className="eyebrow">CARE</p>
          <h2 className="display mt-2 text-3xl">照護與認養條件</h2>
          <p className="mt-5 leading-7 text-muted">{pet.specialCare ?? "未提供特殊照護資訊。"}</p>
          <p className="mt-4 leading-7">{pet.adoptionConditions ?? "請向照護者確認完整認養條件。"}</p>
        </Card>
      </div>

      {government && pet.source ? (
        <Card tone="mint" className="mt-6">
          <p className="eyebrow">DATA ATTRIBUTION</p>
          <p className="mt-2 font-bold">{pet.source.attribution}</p>
          <p className="mt-2 text-sm text-muted">
            官方編號：{pet.source.officialReference ?? "未提供"} · {pet.freshnessText}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-accent">
            <a href={pet.source.datasetUrl} target="_blank" rel="noreferrer">查看資料集</a>
            <a href={pet.source.licenseUrl} target="_blank" rel="noreferrer">
              {pet.source.licenseName}
            </a>
          </div>
        </Card>
      ) : (
        <section className="mt-12">
          <p className="eyebrow">WHAT HAPPENS NEXT</p>
          <h2 className="display mt-2 text-3xl">Pawtner 認養流程</h2>
          <div className="mt-6">
            <ProcessStepper steps={STEPS} current={processIndex} />
          </div>
        </section>
      )}
    </main>
  );
}
