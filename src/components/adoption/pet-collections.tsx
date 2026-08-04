"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { MatchExplanation } from "@/components/match-explanation";
import { PetCard } from "@/components/pet-card";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MatchResult } from "@/lib/matching/score";
import type { PublicPetDetail, PublicPetSummary } from "@/lib/pets/public-types";

type FavoriteItem = { id: string; pet_id: string; pet: PublicPetDetail };
type RecommendationItem = MatchResult & { pet: PublicPetSummary; followUpQuestions: string[]; missingData: string[] };

export function PetCollections({ mode }: { mode: "favorites" | "recommendations" }) {
  const t = useTranslations("Adopter");
  const actions = useTranslations("Actions");
  const [items, setItems] = useState<Array<FavoriteItem | RecommendationItem>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const endpoint = mode === "favorites" ? "/api/favorites" : "/api/recommendations";
  const load = useCallback(async (next?: string) => {
    try {
      const response = await fetch(`${endpoint}?limit=12${next ? `&cursor=${encodeURIComponent(next)}` : ""}`, { cache: "no-store" });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message ?? t("unableData"));
      setItems((current) => next ? [...current, ...payload.data.items] : payload.data.items); setCursor(payload.data.nextCursor); setState("ready");
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("unableData")); setState("error"); }
  }, [endpoint, t]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function removeFavorite(petId: string) {
    const response = await fetch(`/api/favorites?petId=${encodeURIComponent(petId)}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error?.message ?? t("removeFailed")); setState("error"); return; }
    setItems((current) => current.filter((item) => item.pet.id !== petId));
  }
  if (state === "loading" && !items.length) return <Card className="mt-8 animate-pulse">{t("loadingGeneric")}</Card>;
  if (state === "error") return <Alert title={t("unableToLoad")} tone="danger"><p>{error}</p><Button className="mt-3" onClick={() => { setState("loading"); void load(); }}>{actions("retry")}</Button></Alert>;
  if (!items.length) return <Card tone="mint" className="mt-8"><h2 className="display text-2xl">{t("nothingHere")}</h2><p className="mt-2 text-muted">{mode === "favorites" ? t("favoriteEmpty") : t("recommendEmpty")}</p><ButtonLink className="mt-4" href={mode === "favorites" ? "/explore" : "/me"}>{mode === "favorites" ? t("explorePets") : t("completeQuestionnaire")}</ButtonLink></Card>;
  return <><div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => {
    const pet = item.pet; return <div key={mode === "favorites" ? (item as FavoriteItem).id : pet.id} className="space-y-3"><PetCard pet={pet} />{mode === "recommendations" ? <MatchExplanation result={{ ...(item as RecommendationItem), questions: (item as RecommendationItem).followUpQuestions }} /> : <Button variant="secondary" onClick={() => void removeFavorite(pet.id)}>{t("removeFavorite")}</Button>}</div>;
  })}</div>{cursor ? <Button className="mt-8" variant="secondary" onClick={() => { setState("loading"); void load(cursor); }}>{actions("loadMore")}</Button> : null}</>;
}
