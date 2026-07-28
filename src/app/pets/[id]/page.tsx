import { notFound } from "next/navigation";

import { MediaGallery } from "@/components/pet-media";
import { ProcessStepper } from "@/components/process-stepper";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VerificationRow } from "@/components/verification-row";
import { getPublicPet } from "@/lib/pets/public-data";
import {
  formatAge,
  PET_STATUS_PRESENTATION,
  SEX_LABELS,
  SPECIES_LABELS,
} from "@/lib/pets/presentation";

const STEPS = ["表達興趣", "彼此了解", "安排見面", "試養與確認"] as const;

export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pet = await getPublicPet(id).catch(() => null);
  if (!pet) notFound();
  const status = PET_STATUS_PRESENTATION[pet.status];
  const processIndex = pet.status === "trial_adoption" ? 3 : pet.status === "reserved" ? 2 : pet.status === "application_pending" ? 1 : 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-7 sm:px-7 sm:py-10">
      <a href="/explore" className="text-sm font-bold text-accent">← 回到探索</a>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
        <MediaGallery media={pet.media} name={pet.name} />
        <section>
          <div className="flex flex-wrap gap-2">
            <Badge variant={status.variant} icon={<span aria-hidden="true">{status.icon}</span>}>{status.label}</Badge>
            <Badge>{SPECIES_LABELS[pet.species]}</Badge>
          </div>
          <h1 className="display mt-4 text-5xl sm:text-6xl">{pet.name}</h1>
          <p className="mt-3 text-lg text-muted">
            {[pet.sex ? SEX_LABELS[pet.sex] : null, formatAge(pet.ageMonths), pet.breed, pet.region].filter(Boolean).join("・")}
          </p>
          <div className="mt-6">
            <VerificationRow
              name={pet.organization?.name ?? pet.fosterDisplayName}
              verified={pet.organization?.isVerified ?? false}
            />
          </div>
          <p className="mt-7 text-lg leading-8">{pet.personalitySummary ?? "中途正在整理更多日常觀察，歡迎先從現有紀錄認識牠。"}</p>
          {pet.temperamentTags.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {pet.temperamentTags.map((tag) => <Badge key={tag} variant="neutral">{tag}</Badge>)}
            </div>
          ) : null}
          <Card tone="warm" className="mt-7">
            <p className="eyebrow">BEFORE YOU APPLY</p>
            <p className="mt-2 font-bold">{status.description}</p>
            <p className="mt-2 text-sm leading-6 text-muted">先閱讀完整紀錄與適合的家庭條件，再決定是否表達興趣。</p>
          </Card>
          <ButtonLink href="/login" size="lg" className="mt-6 w-full">登入並表達興趣</ButtonLink>
        </section>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <p className="eyebrow">LIFE RECORD</p>
          <h2 className="display mt-2 text-3xl">生活與照護紀錄</h2>
          <dl className="mt-6 grid grid-cols-2 gap-5 text-sm sm:grid-cols-3">
            {[
              ["體重", pet.weightKg ? `${pet.weightKg} kg` : "待確認"],
              ["絕育", pet.sterilized === null ? "待確認" : pet.sterilized ? "已完成" : "尚未"],
              ["晶片", pet.microchipped === null ? "待確認" : pet.microchipped ? "已植入" : "尚未"],
              ["疫苗", pet.vaccinated === null ? "待確認" : pet.vaccinated ? "已施打" : "尚未"],
              ["驅蟲", pet.dewormed === null ? "待確認" : pet.dewormed ? "已完成" : "尚未"],
              ["資料完整度", `${pet.profileCompleteness}%`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="data-label">{label}</dt>
                <dd className="mt-1 font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          {pet.specialCare ? (
            <div className="mt-7 border-t pt-6">
              <h3 className="font-bold">特別照護</h3>
              <p className="mt-2 leading-7 text-muted">{pet.specialCare}</p>
            </div>
          ) : null}
        </Card>

        <Card>
          <p className="eyebrow">HEALTH</p>
          <h2 className="display mt-2 text-3xl">健康紀錄</h2>
          {pet.healthRecords.length ? (
            <ol className="mt-6 space-y-4">
              {pet.healthRecords.map((record) => (
                <li key={record.id} className="border-l-2 border-sage pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{record.title}</p>
                    {record.isCritical ? <Badge variant="danger">需要留意</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-muted">{record.recordDate}</p>
                  {record.details ? <p className="mt-2 text-sm leading-6 text-muted">{record.details}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 leading-7 text-muted">目前沒有公開的健康事件；基本照護狀態請參考左側生命紀錄。</p>
          )}
        </Card>
      </div>

      <Card tone="mint" className="mt-6">
        <p className="eyebrow">A GOOD HOME</p>
        <h2 className="display mt-2 text-3xl">適合的家庭與領養條件</h2>
        <p className="mt-4 max-w-4xl leading-8">{pet.adoptionConditions ?? "中途會在進一步認識時，和你一起討論生活環境、作息與照護安排。"}</p>
        {pet.missingInformation.length ? (
          <p className="mt-4 text-sm text-muted">仍待補充：{pet.missingInformation.join("、")}。送出申請前請向中途確認。</p>
        ) : null}
      </Card>

      <section className="mt-12">
        <p className="eyebrow">WHAT HAPPENS NEXT</p>
        <h2 className="display mt-2 text-3xl">接下來會發生什麼</h2>
        <div className="mt-6">
          <ProcessStepper steps={STEPS} current={processIndex} />
        </div>
      </section>
    </main>
  );
}
