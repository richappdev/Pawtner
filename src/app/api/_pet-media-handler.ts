import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { jsonError, jsonOk, parseJson, requireActor } from "@/app/api/_shared";
import { writeAuditLog } from "@/lib/audit";
import { canManagePet } from "@/lib/auth/permissions";
import {
  extensionForPetPhoto,
  isPetPhotoMimeType,
  MAX_PET_PHOTO_BYTES,
  MAX_UPLOADED_PET_PHOTOS,
  PET_MEDIA_BUCKET,
  toAdminPetMediaItems,
  type PetPhotoMimeType,
  type PetMediaRow,
} from "@/lib/pets/media";

const uuid = z.string().uuid();
const orderSchema = z.object({
  mediaIds: z.array(uuid).max(MAX_UPLOADED_PET_PHOTOS),
});

function pathParts(request: Request) {
  return new URL(request.url).pathname.split("/").filter(Boolean);
}

function petId(request: Request): string {
  const parts = pathParts(request);
  return parts[parts.indexOf("pets") + 1] ?? "";
}

function mediaId(request: Request): string {
  const parts = pathParts(request);
  return parts[parts.indexOf("media") + 1] ?? "";
}

function mediaError(message: string, code?: string) {
  if (code === "42501") return jsonError("Pet management permission is required.", 403);
  if (code === "P0002" || message.includes("not found")) return jsonError(message, 404);
  if (code === "23514" || code === "23505" || message.includes("at most five")) {
    return jsonError(message, 409);
  }
  return jsonError(message, 500);
}

async function requirePetManager(request: Request) {
  const actor = await requireActor(request);
  if (!("actor" in actor)) return actor;
  if (!canManagePet(actor.actor, {})) {
    return { response: jsonError("Pet management permission is required.", 403) } as const;
  }
  return actor;
}

async function audit(
  actor: { supabase: SupabaseClient; actor: { id: string } },
  action: string,
  targetPetId: string,
  metadata: Record<string, unknown>,
) {
  await writeAuditLog(actor.supabase, {
    actorId: actor.actor.id,
    action,
    resourceType: "pet_media",
    resourceId: targetPetId,
    metadata,
  });
}

async function present(actor: { supabase: Parameters<typeof toAdminPetMediaItems>[0] }, rows: unknown) {
  return toAdminPetMediaItems(actor.supabase, (rows ?? []) as PetMediaRow[]);
}

export async function POST(request: Request) {
  const actor = await requirePetManager(request);
  if (!("actor" in actor)) return actor.response;
  const targetPetId = petId(request);
  if (!uuid.safeParse(targetPetId).success) return jsonError("Invalid pet ID.", 422);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Request body must be multipart form data.", 400);
  }
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  if (!files.length) return jsonError("At least one photo is required.", 422);
  if (files.length > MAX_UPLOADED_PET_PHOTOS) {
    return jsonError(`A pet can have at most ${MAX_UPLOADED_PET_PHOTOS} uploaded photos.`, 409);
  }

  for (const file of files) {
    if (!isPetPhotoMimeType(file.type)) {
      return jsonError("Only JPEG, PNG, and WebP photos are supported.", 422);
    }
    if (file.size <= 0 || file.size > MAX_PET_PHOTO_BYTES) {
      return jsonError("Each photo must be larger than zero bytes and no more than 20 MB.", 422);
    }
  }

  const { count, error: countError } = await actor.supabase
    .from("pet_media")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", targetPetId)
    .not("storage_path", "is", null)
    .eq("media_type", "image");
  if (countError) return jsonError(countError.message, 500);
  if ((count ?? 0) + files.length > MAX_UPLOADED_PET_PHOTOS) {
    return jsonError(`A pet can have at most ${MAX_UPLOADED_PET_PHOTOS} uploaded photos.`, 409);
  }

  const uploadedPaths: string[] = [];
  for (const file of files) {
    const path = `${targetPetId}/${crypto.randomUUID()}.${extensionForPetPhoto(file.type as PetPhotoMimeType)}`;
    const { error } = await actor.supabase.storage.from(PET_MEDIA_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      if (uploadedPaths.length) {
        await actor.supabase.storage.from(PET_MEDIA_BUCKET).remove(uploadedPaths);
      }
      return jsonError(`Unable to upload ${file.name}.`, 500);
    }
    uploadedPaths.push(path);
  }

  const { data, error } = await actor.supabase.rpc("register_admin_pet_photos", {
    p_pet_id: targetPetId,
    p_storage_paths: uploadedPaths,
  });
  if (error) {
    await actor.supabase.storage.from(PET_MEDIA_BUCKET).remove(uploadedPaths);
    return mediaError(error.message, error.code);
  }

  await audit(actor, "pet_media.upload", targetPetId, {
    mediaIds: (data ?? []).map((row: { id: string }) => row.id),
    count: files.length,
  });
  return jsonOk(await present(actor, data), { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await requirePetManager(request);
  if (!("actor" in actor)) return actor.response;
  const targetPetId = petId(request);
  if (!uuid.safeParse(targetPetId).success) return jsonError("Invalid pet ID.", 422);
  const parts = pathParts(request);

  if (parts.at(-1) === "order") {
    const body = await parseJson(request, orderSchema);
    if ("response" in body) return body.response;
    const { data, error } = await actor.supabase.rpc("reorder_admin_pet_photos", {
      p_pet_id: targetPetId,
      p_media_ids: body.data.mediaIds,
    });
    if (error) return mediaError(error.message, error.code);
    await audit(actor, "pet_media.reorder", targetPetId, { mediaIds: body.data.mediaIds });
    return jsonOk(await present(actor, data));
  }

  if (parts.at(-1) === "cover") {
    const targetMediaId = mediaId(request);
    if (!uuid.safeParse(targetMediaId).success) return jsonError("Invalid media ID.", 422);
    const { data, error } = await actor.supabase.rpc("set_admin_pet_photo_cover", {
      p_pet_id: targetPetId,
      p_media_id: targetMediaId,
    });
    if (error) return mediaError(error.message, error.code);
    await audit(actor, "pet_media.cover", targetPetId, { mediaId: targetMediaId });
    return jsonOk(await present(actor, data));
  }

  return jsonError("Not found.", 404);
}

export async function DELETE(request: Request) {
  const actor = await requirePetManager(request);
  if (!("actor" in actor)) return actor.response;
  const targetPetId = petId(request);
  const targetMediaId = mediaId(request);
  if (!uuid.safeParse(targetPetId).success) return jsonError("Invalid pet ID.", 422);
  if (!uuid.safeParse(targetMediaId).success) return jsonError("Invalid media ID.", 422);

  const { data: deletedPath, error } = await actor.supabase.rpc("delete_admin_pet_photo", {
    p_pet_id: targetPetId,
    p_media_id: targetMediaId,
  });
  if (error) return mediaError(error.message, error.code);

  const cleanup = await actor.supabase.storage.from(PET_MEDIA_BUCKET).remove([deletedPath]);
  if (cleanup.error) {
    console.error("Unable to remove deleted pet photo object.", {
      petId: targetPetId,
      mediaId: targetMediaId,
      storagePath: deletedPath,
      error: cleanup.error.message,
    });
  }
  await audit(actor, "pet_media.delete", targetPetId, {
    mediaId: targetMediaId,
    storagePath: deletedPath,
    storageCleanupFailed: Boolean(cleanup.error),
  });
  return jsonOk({ deleted: true, storageCleanupFailed: Boolean(cleanup.error) });
}
