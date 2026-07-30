import type { SupabaseClient } from "@supabase/supabase-js";

export const PET_MEDIA_BUCKET = "pet-media";
export const MAX_UPLOADED_PET_PHOTOS = 5;
export const MAX_PET_PHOTO_BYTES = 20 * 1024 * 1024;
export const PET_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type PetPhotoMimeType = (typeof PET_PHOTO_MIME_TYPES)[number];

export interface PetMediaRow {
  id: string;
  pet_id: string;
  storage_path: string | null;
  external_url: string | null;
  media_type: "image" | "video";
  is_cover: boolean;
  is_ai_edited: boolean;
  is_public: boolean;
  sort_order: number;
  created_at?: string;
}

export interface AdminPetMediaItem {
  id: string;
  url: string;
  source: "uploaded" | "government";
  mediaType: "image";
  isCover: boolean;
  sortOrder: number;
  createdAt: string | null;
}

export function isPetPhotoMimeType(value: string): value is PetPhotoMimeType {
  return PET_PHOTO_MIME_TYPES.includes(value as PetPhotoMimeType);
}

export function extensionForPetPhoto(value: PetPhotoMimeType): "jpg" | "png" | "webp" {
  if (value === "image/png") return "png";
  if (value === "image/webp") return "webp";
  return "jpg";
}

export function orderUploadedPetPhotos<T extends Pick<PetMediaRow, "is_cover" | "sort_order" | "id">>(
  rows: T[],
): T[] {
  return [...rows].sort((left, right) => {
    if (left.is_cover !== right.is_cover) return left.is_cover ? -1 : 1;
    return left.sort_order - right.sort_order || left.id.localeCompare(right.id);
  });
}

export function selectPublicPetMediaRows(
  rows: PetMediaRow[],
  sourceType: "private_foster" | "government",
): PetMediaRow[] {
  const uploaded = rows.filter(
    (row) => row.storage_path && row.media_type === "image" && row.is_public,
  );

  if (uploaded.length) {
    return orderUploadedPetPhotos(uploaded).slice(0, MAX_UPLOADED_PET_PHOTOS);
  }
  if (sourceType === "private_foster") return [];

  return rows
    .filter((row) => row.external_url && row.media_type === "image" && row.is_public)
    .sort((left, right) => {
      if (left.is_cover !== right.is_cover) return left.is_cover ? -1 : 1;
      return left.sort_order - right.sort_order || left.id.localeCompare(right.id);
    })
    .slice(0, 1);
}

export async function toAdminPetMediaItems(
  supabase: SupabaseClient,
  rows: PetMediaRow[],
): Promise<AdminPetMediaItem[]> {
  const uploaded = rows
    .filter((row) => row.storage_path && row.media_type === "image")
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));
  const signed = uploaded.length
    ? await supabase.storage
        .from(PET_MEDIA_BUCKET)
        .createSignedUrls(uploaded.map((row) => row.storage_path!), 60 * 60)
    : { data: [] };

  const uploadedItems = uploaded.flatMap((row, index) => {
    const url = signed.data?.[index]?.signedUrl;
    return url
      ? [{
          id: row.id,
          url,
          source: "uploaded" as const,
          mediaType: "image" as const,
          isCover: row.is_cover,
          sortOrder: row.sort_order,
          createdAt: row.created_at ?? null,
        }]
      : [];
  });
  const governmentItems = rows.flatMap((row) =>
    row.external_url && row.media_type === "image"
      ? [{
          id: row.id,
          url: row.external_url,
          source: "government" as const,
          mediaType: "image" as const,
          isCover: row.is_cover,
          sortOrder: row.sort_order,
          createdAt: row.created_at ?? null,
        }]
      : [],
  );

  return [...uploadedItems, ...governmentItems];
}
