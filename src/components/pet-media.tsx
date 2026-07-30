"use client";

import Image from "next/image";
import { useState } from "react";

import type { PetMediaView } from "@/lib/pets/public-types";

export function PetMediaPlaceholder({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${name}的照片準備中`}
      className={`paper-grid relative flex min-h-48 items-end overflow-hidden bg-mint p-5 ${className}`}
    >
      <div className="absolute -left-8 top-8 h-32 w-40 rotate-12 rounded-[42%] bg-sage/80" />
      <div className="absolute right-8 top-8 h-24 w-24 -rotate-12 rounded-[35%] bg-apricot/85" />
      <div className="absolute bottom-10 left-1/2 h-24 w-40 -translate-x-1/2 rounded-[50%_50%_40%_40%] border-2 border-accent/25 bg-surface/55" />
      <span className="relative z-10 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-bold text-accent">
        照片準備中
      </span>
    </div>
  );
}

export function PetCover({
  media,
  name,
  className = "",
  priority = false,
}: {
  media: PetMediaView | null;
  name: string;
  className?: string;
  priority?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = Boolean(media?.url && failedUrl === media.url);

  if (!media || media.mediaType !== "image" || failed) {
    return <PetMediaPlaceholder name={name} className={className} />;
  }

  return (
    <div className={`relative overflow-hidden bg-mint ${className}`}>
      <Image
        src={media.url}
        alt={media.alt}
        fill
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
        onError={() => setFailedUrl(media.url)}
      />
      {media.isAiEdited ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-bold text-muted">
          影像曾協助調整
        </span>
      ) : null}
    </div>
  );
}

export function MediaGallery({
  media,
  name,
}: {
  media: PetMediaView[];
  name: string;
}) {
  const images = media.filter((item) => item.mediaType === "image");
  if (!images.length) {
    return <PetMediaPlaceholder name={name} className="aspect-[4/3] rounded-[24px]" />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
      <PetCover media={images[0]} name={name} priority className="aspect-[4/3] rounded-[24px]" />
      <div className="grid grid-cols-2 gap-3">
        {images.slice(1, 5).map((item) => (
          <PetCover key={item.id} media={item} name={name} className="aspect-square rounded-[18px]" />
        ))}
        {images.length === 1 ? (
          <PetMediaPlaceholder name={name} className="aspect-square rounded-[18px]" />
        ) : null}
      </div>
    </div>
  );
}
