"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MAX_PET_PHOTO_BYTES,
  MAX_UPLOADED_PET_PHOTOS,
  PET_PHOTO_MIME_TYPES,
  type AdminPetMediaItem,
} from "@/lib/pets/media";

interface ApiPayload {
  error?: { message?: string };
}

function responseMessage(raw: string, fallback: string): string {
  try {
    return (JSON.parse(raw) as ApiPayload).error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function PetMediaManager({
  petId,
  petName,
  sourceType,
  initialMedia,
}: {
  petId: string;
  petName: string;
  sourceType: "private_foster" | "government";
  initialMedia: AdminPetMediaItem[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initialMedia);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploaded = items
    .filter((item) => item.source === "uploaded")
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const governmentFallback = items.find((item) => item.source === "government");
  const remaining = MAX_UPLOADED_PET_PHOTOS - uploaded.length;

  async function mutate(path: string, method: "PATCH" | "DELETE", body?: unknown) {
    setPending(path);
    setError(null);
    try {
      const response = await fetch(path, {
        method,
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const raw = await response.text();
      if (!response.ok) throw new Error(responseMessage(raw, "Unable to update pet photos."));
      router.refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update pet photos.");
      return false;
    } finally {
      setPending(null);
    }
  }

  function upload(files: FileList | null) {
    if (!files?.length) return;
    const selected = [...files];
    setError(null);

    if (selected.length > remaining) {
      setError(`You can upload ${remaining} more photo${remaining === 1 ? "" : "s"}.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const invalid = selected.find(
      (file) =>
        !(PET_PHOTO_MIME_TYPES as readonly string[]).includes(file.type) ||
        file.size <= 0 ||
        file.size > MAX_PET_PHOTO_BYTES,
    );
    if (invalid) {
      setError(`${invalid.name} must be a JPEG, PNG, or WebP file no larger than 20 MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const formData = new FormData();
    selected.forEach((file) => formData.append("files", file));
    const request = new XMLHttpRequest();
    setPending("upload");
    setUploadProgress(0);
    request.open("POST", `/api/admin/pets/${petId}/media`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        setError(responseMessage(request.responseText, "Unable to upload pet photos."));
      } else {
        router.refresh();
      }
      setPending(null);
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    };
    request.onerror = () => {
      setError("The upload connection failed. Please try again.");
      setPending(null);
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    };
    request.send(formData);
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= uploaded.length) return;
    const next = [...uploaded];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((item, sortOrder) => ({ ...item, sortOrder }));
    setItems([...reordered, ...items.filter((item) => item.source === "government")]);
    const succeeded = await mutate(`/api/admin/pets/${petId}/media/order`, "PATCH", {
      mediaIds: reordered.map((item) => item.id),
    });
    if (!succeeded) setItems(items);
  }

  return (
    <Card className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">PET MEDIA</p>
          <h2 className="display mt-2 text-2xl">Photos</h2>
          <p className="mt-2 text-sm text-muted">
            Add up to five public photos. The selected cover appears on Explore and first on the pet detail page.
          </p>
        </div>
        <Badge variant={remaining === 0 ? "pending" : "neutral"}>
          {uploaded.length}/{MAX_UPLOADED_PET_PHOTOS} uploaded
        </Badge>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed p-4">
        <label className="field-label" htmlFor={`pet-media-${petId}`}>
          Upload JPEG, PNG, or WebP
        </label>
        <input
          ref={inputRef}
          id={`pet-media-${petId}`}
          type="file"
          accept={PET_PHOTO_MIME_TYPES.join(",")}
          multiple
          disabled={remaining === 0 || pending !== null}
          onChange={(event) => upload(event.currentTarget.files)}
          className="mt-3 block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-mint file:px-4 file:py-3 file:font-semibold file:text-accent"
        />
        <p className="mt-2 text-xs text-muted">
          {remaining > 0
            ? `${remaining} photo${remaining === 1 ? "" : "s"} remaining · 20 MB per file`
            : "Photo limit reached"}
        </p>
        {uploadProgress !== null ? (
          <div className="mt-3" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="mt-1 text-xs font-semibold">{uploadProgress}% uploaded</p>
          </div>
        ) : null}
      </div>

      {uploaded.length ? (
        <ol className="mt-5 grid gap-4 sm:grid-cols-2">
          {uploaded.map((item, index) => (
            <li key={item.id} className="overflow-hidden rounded-2xl border bg-surface">
              <div className="relative aspect-[4/3] bg-surface-soft">
                <Image
                  src={item.url}
                  alt={`${petName} uploaded photo ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge>#{index + 1}</Badge>
                  {item.isCover ? <Badge variant="success">Cover</Badge> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                {!item.isCover ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending !== null}
                    onClick={() =>
                      void mutate(`/api/admin/pets/${petId}/media/${item.id}/cover`, "PATCH")
                    }
                  >
                    Set as cover
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  disabled={pending !== null || index === 0}
                  onClick={() => void move(index, -1)}
                  aria-label={`Move photo ${index + 1} earlier`}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  disabled={pending !== null || index === uploaded.length - 1}
                  onClick={() => void move(index, 1)}
                  aria-label={`Move photo ${index + 1} later`}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={pending !== null}
                  onClick={() => void mutate(`/api/admin/pets/${petId}/media/${item.id}`, "DELETE")}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-2xl bg-surface-soft p-4 text-sm text-muted">No Pawtner photos uploaded.</p>
      )}

      {sourceType === "government" && governmentFallback ? (
        <div className="mt-6 border-t pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Official government fallback</h3>
            <Badge variant="pending">Read only</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            This image is shown publicly only when no Pawtner photo has been uploaded.
          </p>
          <div className="relative mt-3 aspect-[4/3] max-w-sm overflow-hidden rounded-2xl bg-surface-soft">
            <Image
              src={governmentFallback.url}
              alt={`${petName} official government photo`}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
