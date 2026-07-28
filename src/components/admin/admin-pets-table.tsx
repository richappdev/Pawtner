"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { AdminPetActions } from "@/components/admin/admin-pet-actions";
import { GovernmentPublicationActions } from "@/components/admin/government-publication-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { remainingSelectedPetIds } from "@/lib/pets/admin-bulk-selection";
import { singleRelatedRecord } from "@/lib/pets/source-record";
import type {
  PetSourcePublicationStatus,
  PetSourceQualityStatus,
  PetSourceType,
  PetSpecies,
  PetStatus,
} from "@/lib/schemas/pet";

export interface AdminPetListItem {
  id: string;
  name: string;
  species: PetSpecies;
  source_type: PetSourceType;
  region: string | null;
  status: PetStatus;
  is_published: boolean;
  updated_at: string;
  foster_profiles?: { display_name?: string | null } | null;
  pet_source_records?: {
    shelter_name?: string | null;
    last_seen_at?: string | null;
    availability?: string | null;
    quality_status?: PetSourceQualityStatus;
    publication_status?: PetSourcePublicationStatus;
    hold_reason?: string | null;
  } | Array<{
    shelter_name?: string | null;
    last_seen_at?: string | null;
    availability?: string | null;
    quality_status?: PetSourceQualityStatus;
    publication_status?: PetSourcePublicationStatus;
    hold_reason?: string | null;
  }> | null;
}

type BulkAction = "publish" | "hide";
type BulkResult = {
  petId: string;
  status: "succeeded" | "skipped" | "failed";
  reason?: string;
};
type BulkResponse = {
  results: BulkResult[];
  summary: { requested: number; succeeded: number; skipped: number; failed: number };
};

const STATUS_OPTIONS: PetStatus[] = [
  "intake", "medical_hold", "available", "application_pending", "reserved",
  "trial_adoption", "adopted", "hidden", "archived",
];
const QUALITY_OPTIONS: PetSourceQualityStatus[] = ["pending", "clean", "warning", "blocked"];
const PUBLICATION_OPTIONS: PetSourcePublicationStatus[] = [
  "pending_review", "approved", "published", "held", "unpublished_source_change",
];
const PAGE_SIZES = [10, 25, 50, 100] as const;

function displayedPages(page: number, totalPages: number) {
  return [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
}

export function AdminPetsTable({
  pets,
  filters,
  page,
  pageSize,
  total,
  totalPages,
}: {
  pets: AdminPetListItem[];
  filters: {
    status?: string;
    species?: string;
    source?: string;
    qualityStatus?: string;
    publicationStatus?: string;
    isPublished?: string;
    q?: string;
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectAllRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bulkResponse, setBulkResponse] = useState<BulkResponse | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const pageIds = useMemo(() => pets.map((pet) => pet.id), [pets]);
  const selectedPets = pets.filter((pet) => selected.has(pet.id));
  const includesGovernment = selectedPets.some((pet) => pet.source_type === "government");
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = pageIds.some((id) => selected.has(id));
  const namesById = useMemo(
    () => new Map(pets.map((pet) => [pet.id, pet.name])),
    [pets],
  );

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [allSelected, someSelected]);

  function hrefFor(nextPage: number, nextPageSize = pageSize) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextPageSize));
    return `${pathname}?${params.toString()}`;
  }

  function toggleOne(petId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(pageIds));
  }

  function openBulkDialog(action: BulkAction) {
    setBulkAction(action);
    setReason("");
    setBulkError(null);
    dialogRef.current?.showModal();
  }

  function closeBulkDialog() {
    if (!submitting) dialogRef.current?.close();
  }

  async function submitBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    if (bulkAction === "hide" && includesGovernment && !reason.trim()) {
      setBulkError("隱藏政府來源毛孩時必須填寫理由。");
      return;
    }

    setSubmitting(true);
    setBulkError(null);
    try {
      const response = await fetch("/api/admin/pets/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petIds: [...selected],
          action: bulkAction,
          reason: reason.trim() || undefined,
        }),
      });
      const payload = await response.json() as {
        data?: BulkResponse;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        setBulkError(payload.error?.message ?? "批次操作失敗，請稍後再試。");
        return;
      }

      setSelected((current) => remainingSelectedPetIds(current, payload.data!.results));
      setBulkResponse(payload.data);
      dialogRef.current?.close();
      startTransition(() => router.refresh());
    } catch {
      setBulkError("批次操作失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <Card>
        <form method="get" className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <input type="hidden" name="pageSize" value={pageSize} />
          <label className="text-sm"><span className="mb-1 block font-semibold">搜尋</span><input name="q" defaultValue={filters.q ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm" /></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">動物狀態</span><select name="status" defaultValue={filters.status ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option>{STATUS_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">物種</span><select name="species" defaultValue={filters.species ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option><option value="dog">dog</option><option value="cat">cat</option><option value="other">other</option></select></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">來源</span><select name="source" defaultValue={filters.source ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option><option value="private_foster">Pawtner 中途</option><option value="government">政府資料</option></select></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">資料品質</span><select name="qualityStatus" defaultValue={filters.qualityStatus ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option>{QUALITY_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">發布流程</span><select name="publicationStatus" defaultValue={filters.publicationStatus ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option>{PUBLICATION_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">公開狀態</span><select name="isPublished" defaultValue={filters.isPublished ?? ""} className="w-full rounded-xl border bg-surface px-3 py-2 text-sm"><option value="">全部</option><option value="true">已公開</option><option value="false">未公開</option></select></label>
          <div className="xl:col-span-7"><button type="submit" className="min-h-11 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white">套用篩選</button></div>
        </form>
      </Card>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-mint px-4 py-3">
          <p className="text-sm font-semibold">已選取 {selected.size} 筆</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => openBulkDialog("publish")}>批次刊登</Button>
            <Button type="button" size="sm" variant="danger" onClick={() => openBulkDialog("hide")}>批次隱藏</Button>
          </div>
        </div>
      ) : null}

      {bulkResponse ? (
        <Alert
          title={`批次操作完成：成功 ${bulkResponse.summary.succeeded}、跳過 ${bulkResponse.summary.skipped}、失敗 ${bulkResponse.summary.failed}`}
          tone={bulkResponse.summary.failed > 0 ? "danger" : bulkResponse.summary.skipped > 0 ? "warning" : "success"}
        >
          {bulkResponse.results.some((result) => result.status !== "succeeded") ? (
            <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5">
              {bulkResponse.results.filter((result) => result.status !== "succeeded").map((result) => (
                <li key={result.petId}>
                  {namesById.get(result.petId) ?? result.petId}：{result.reason ?? "未完成"}
                </li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}

      {pets.length === 0 ? <Card><p>沒有符合目前篩選條件的毛孩。</p></Card> : (
        <div className="overflow-x-auto rounded-2xl border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-surface-soft text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="選取本頁全部毛孩"
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </th>
                {["名稱", "來源", "物種", "地區", "官方狀態", "資料品質", "發布流程", "公開", "提供單位", "最後同步", "操作"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {pets.map((pet) => {
                const sourceRecord = singleRelatedRecord(pet.pet_source_records);
                return (
                  <tr key={pet.id} className="border-b align-top last:border-b-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(pet.id)}
                        onChange={() => toggleOne(pet.id)}
                        aria-label={`選取 ${pet.name}`}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </td>
                    <td className="px-4 py-3"><Link href={`/admin/pets/${pet.id}`} className="font-semibold text-accent hover:underline">{pet.name}</Link></td>
                    <td className="px-4 py-3"><Badge variant={pet.source_type === "government" ? "pending" : "neutral"}>{pet.source_type === "government" ? "政府" : "中途"}</Badge></td>
                    <td className="px-4 py-3">{pet.species}</td>
                    <td className="px-4 py-3">{pet.region ?? "—"}</td>
                    <td className="px-4 py-3"><Badge>{sourceRecord?.availability ?? pet.status}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={sourceRecord?.quality_status === "blocked" ? "danger" : sourceRecord?.quality_status === "clean" ? "success" : "pending"}>{sourceRecord?.quality_status ?? "—"}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={sourceRecord?.publication_status === "published" ? "success" : "pending"}>{sourceRecord?.publication_status ?? "private review"}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={pet.is_published ? "success" : "pending"}>{pet.is_published ? "published" : "not public"}</Badge></td>
                    <td className="px-4 py-3">{sourceRecord?.shelter_name ?? pet.foster_profiles?.display_name ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(sourceRecord?.last_seen_at ?? pet.updated_at).toLocaleString("zh-TW")}</td>
                    <td className="min-w-56 px-4 py-3">
                      {pet.source_type === "government" && sourceRecord?.publication_status && sourceRecord.quality_status ? (
                        <GovernmentPublicationActions petId={pet.id} publicationStatus={sourceRecord.publication_status} qualityStatus={sourceRecord.quality_status} />
                      ) : (
                        <AdminPetActions petId={pet.id} actions={["hide", "unpublish", "archive"]} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          符合條件共 <strong className="text-foreground">{total}</strong> 筆 · 第 {page} / {totalPages} 頁
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold">
            每頁
            <select
              aria-label="每頁顯示筆數"
              value={pageSize}
              onChange={(event) => router.push(hrefFor(1, Number(event.target.value)))}
              className="ml-2 min-h-11 rounded-xl border bg-surface px-3 py-2"
            >
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={page <= 1 ? hrefFor(1) : hrefFor(page - 1)} className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-semibold ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-mint"}`}>上一頁</Link>
          {displayedPages(page, totalPages).map((pageNumber, index, values) => (
            <span key={pageNumber} className="contents">
              {index > 0 && pageNumber - values[index - 1] > 1 ? <span aria-hidden="true">…</span> : null}
              <Link
                href={hrefFor(pageNumber)}
                aria-current={pageNumber === page ? "page" : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold ${pageNumber === page ? "bg-accent text-white" : "hover:bg-mint"}`}
              >
                {pageNumber}
              </Link>
            </span>
          ))}
          <Link aria-disabled={page >= totalPages} tabIndex={page >= totalPages ? -1 : undefined} href={page >= totalPages ? hrefFor(totalPages) : hrefFor(page + 1)} className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-semibold ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-mint"}`}>下一頁</Link>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          if (submitting) event.preventDefault();
        }}
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <h2 className="display text-2xl">{bulkAction === "publish" ? "確認批次刊登" : "確認批次隱藏"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            將處理目前選取的 {selected.size} 筆資料；不符合安全條件的項目會被跳過。
          </p>
          {bulkAction === "hide" ? (
            <label className="mt-4 block text-sm font-semibold">
              隱藏理由{includesGovernment ? "（政府來源必填）" : "（選填）"}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={2_000}
                className="mt-2 min-h-24 w-full rounded-xl border bg-surface px-3 py-2 text-sm"
              />
            </label>
          ) : null}
          {bulkError ? <p role="alert" className="mt-3 text-sm text-red-700">{bulkError}</p> : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={submitting} onClick={closeBulkDialog}>取消</Button>
            <Button
              type="button"
              variant={bulkAction === "hide" ? "danger" : "primary"}
              disabled={submitting || (bulkAction === "hide" && includesGovernment && !reason.trim())}
              onClick={() => void submitBulkAction()}
            >
              {submitting ? "處理中…" : "確認執行"}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
