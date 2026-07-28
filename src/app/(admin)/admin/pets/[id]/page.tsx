import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPetActions } from "@/components/admin/admin-pet-actions";
import { GovernmentPetEnrichmentForm } from "@/components/admin/government-pet-enrichment-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAdminPet } from "@/lib/pets/admin-query";
import type { PetStatus } from "@/lib/schemas/pet";
import { createClient } from "@/lib/supabase/server";

interface AdminPetDetail {
  id: string;
  name: string;
  species: string;
  source_type: "private_foster" | "government";
  breed: string | null;
  sex: string | null;
  age_months: number | null;
  weight_kg: number | null;
  color: string | null;
  region: string | null;
  status: PetStatus;
  sterilized: boolean | null;
  microchipped: boolean | null;
  vaccinated: boolean | null;
  dewormed: boolean | null;
  rabies_vaccinated: boolean | null;
  age_band: string | null;
  body_size: string | null;
  found_location: string | null;
  personality_summary: string | null;
  special_care: string | null;
  adoption_conditions: string | null;
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  foster_profiles?: {
    display_name?: string | null;
    region?: string | null;
  } | null;
  pet_traits?: Array<{
    energy_level: number | null;
    sociability_people: number | null;
    sociability_dogs: number | null;
    sociability_cats: number | null;
    child_friendly: number | null;
    alone_tolerance: number | null;
    tags: string[] | null;
  }> | null;
  pet_health_records?: Array<{
    id: string;
    record_date: string;
    title: string;
    details: string | null;
    is_critical: boolean;
  }> | null;
  pet_media?: Array<{
    id: string;
    storage_path: string | null;
    external_url: string | null;
    media_type: string;
    is_cover: boolean;
    is_ai_edited: boolean;
    is_public: boolean;
    sort_order: number;
  }> | null;
  pet_source_records?: Array<{
    external_sub_id: string | null;
    shelter_name: string | null;
    shelter_address: string | null;
    shelter_phone: string | null;
    official_url: string | null;
    adoption_open_at: string | null;
    last_seen_at: string;
    availability: string;
    pet_sources?: { dataset_name: string; attribution: string; dataset_url: string; license_name: string; license_url: string } | null;
  }> | null;
  pet_editorial_overrides?: Array<{
    display_name: string | null;
    personality_summary: string | null;
    special_care: string | null;
    adoption_conditions: string | null;
    tags: string[] | null;
  }> | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm leading-6">{value ?? "—"}</dd>
    </div>
  );
}

function boolLabel(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value ? "是" : "否";
}

export default async function AdminPetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await getAdminPet(supabase, id);

  if (error) {
    return (
      <main className="w-full p-6 md:p-10">
        <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">Operations</p>
        <h1 className="display mt-2 text-4xl">Pets</h1>
        <Card className="mt-8 max-w-2xl">
          <p className="font-semibold">無法載入毛孩資料</p>
          <p className="mt-2 text-sm leading-6 text-muted">請稍後再試。</p>
          <Link href="/admin/pets" className="mt-4 inline-block text-sm font-semibold text-accent underline">
            返回清單
          </Link>
        </Card>
      </main>
    );
  }

  if (!data) notFound();

  const pet = data as unknown as AdminPetDetail;
  const traits = pet.pet_traits?.[0];
  const health = pet.pet_health_records ?? [];
  const media = [...(pet.pet_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const source = pet.pet_source_records?.[0];
  const enrichment = pet.pet_editorial_overrides?.[0];

  return (
    <main className="w-full space-y-8 p-6 md:p-10">
      <div>
        <Link href="/admin/pets" className="text-sm font-semibold text-accent underline underline-offset-4">
          ← 返回 Pets
        </Link>
        <p className="mt-4 text-sm font-bold tracking-[0.16em] text-accent uppercase">Operations</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="display text-4xl">{pet.name}</h1>
          <Badge>{pet.status}</Badge>
          <Badge variant={pet.source_type === "government" ? "pending" : "neutral"}>
            {pet.source_type === "government" ? "government" : "private foster"}
          </Badge>
          <Badge variant={pet.is_published ? "success" : "pending"}>
            {pet.is_published ? "published" : "draft"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted">
          中途：{pet.foster_profiles?.display_name ?? "—"}
          {pet.foster_profiles?.region ? ` · ${pet.foster_profiles.region}` : ""}
        </p>
      </div>

      <Card className="max-w-3xl">
        <p className="font-semibold">審核操作</p>
        <div className="mt-4">
          <AdminPetActions
            petId={pet.id}
            sourceType={pet.source_type}
            actions={pet.source_type === "government"
              ? ["hide", "unpublish"]
              : ["approve", "request_changes", "hide", "unpublish", "archive"]}
          />
        </div>
      </Card>

      {pet.source_type === "government" && source ? (
        <>
          <Card className="max-w-3xl">
            <p className="eyebrow">SOURCE-CONTROLLED · READ ONLY</p>
            <h2 className="display mt-2 text-2xl">政府來源資料</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="官方編號" value={source.external_sub_id} />
              <Field label="資料狀態" value={source.availability} />
              <Field label="收容所" value={source.shelter_name} />
              <Field label="電話" value={source.shelter_phone} />
              <Field label="地址" value={source.shelter_address} />
              <Field label="認養開放日" value={source.adoption_open_at} />
              <Field label="最後出現" value={new Date(source.last_seen_at).toLocaleString("zh-TW")} />
              <Field label="授權" value={source.pet_sources?.license_name} />
            </dl>
          </Card>
          <GovernmentPetEnrichmentForm petId={pet.id} initial={enrichment} />
        </>
      ) : null}

      <Card className="max-w-3xl">
        <p className="font-semibold">基本資料</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="物種" value={pet.species} />
          <Field label="品種" value={pet.breed} />
          <Field label="性別" value={pet.sex} />
          <Field label="地區" value={pet.region} />
          <Field label="月齡" value={pet.age_months} />
          <Field label="體重 kg" value={pet.weight_kg} />
          <Field label="毛色" value={pet.color} />
          <Field label="刊登時間" value={pet.published_at ? new Date(pet.published_at).toLocaleString("zh-TW") : "—"} />
          <Field label="結紮" value={boolLabel(pet.sterilized)} />
          <Field label="晶片" value={boolLabel(pet.microchipped)} />
          <Field label="疫苗" value={boolLabel(pet.vaccinated)} />
          <Field label="驅蟲" value={boolLabel(pet.dewormed)} />
        </dl>
        <div className="mt-6 space-y-4">
          <Field label="個性摘要" value={pet.personality_summary} />
          <Field label="特殊照護" value={pet.special_care} />
          <Field label="領養條件" value={pet.adoption_conditions} />
        </div>
      </Card>

      <Card className="max-w-3xl">
        <p className="font-semibold">個性指標</p>
        {traits ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="活動量" value={traits.energy_level} />
            <Field label="親人" value={traits.sociability_people} />
            <Field label="親犬" value={traits.sociability_dogs} />
            <Field label="親貓" value={traits.sociability_cats} />
            <Field label="幼童適配" value={traits.child_friendly} />
            <Field label="獨處能力" value={traits.alone_tolerance} />
            <Field label="標籤" value={(traits.tags ?? []).join(", ") || "—"} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">尚未建立個性資料。</p>
        )}
      </Card>

      <Card className="max-w-3xl">
        <p className="font-semibold">健康紀錄</p>
        {health.length === 0 ? (
          <p className="mt-3 text-sm text-muted">尚無健康紀錄。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {health.map((record) => (
              <li key={record.id} className="rounded-xl border px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{record.title}</p>
                  {record.is_critical ? <Badge variant="danger">需要留意</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted">{record.record_date}</p>
                {record.details ? <p className="mt-2 text-sm leading-6">{record.details}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="max-w-3xl">
        <p className="font-semibold">媒體</p>
        {media.length === 0 ? (
          <p className="mt-3 text-sm text-muted">尚無媒體檔案。</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {media.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3">
                <Badge>{item.media_type}</Badge>
                {item.is_cover ? <Badge>cover</Badge> : null}
                {item.is_ai_edited ? <Badge>AI</Badge> : null}
                {item.is_public ? <Badge variant="success">公開</Badge> : <Badge variant="pending">私人</Badge>}
                <span className="break-all text-muted">{item.external_url ?? item.storage_path}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
