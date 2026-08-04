"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Answers = {
  housing_type: "apartment" | "house" | "shared";
  usable_home_size_sqm: number;
  has_fenced_yard: boolean;
  daily_care_hours: number;
  has_children: boolean;
  has_dogs: boolean;
  can_administer_medication: boolean;
  can_provide_grooming: boolean;
  preferred_energy_levels: Array<"low" | "medium" | "high">;
};

const initial: Answers = {
  housing_type: "apartment", usable_home_size_sqm: 30, has_fenced_yard: false,
  daily_care_hours: 2, has_children: false, has_dogs: false,
  can_administer_medication: false, can_provide_grooming: false,
  preferred_energy_levels: ["medium"],
};

export function QuestionnaireEditor() {
  const t = useTranslations("Questionnaire"); const actions = useTranslations("Actions");
  const [answers, setAnswers] = useState(initial);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/me/questionnaire", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? t("loadFailed"));
      if (payload.data.response?.answers) setAnswers(payload.data.response.answers);
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("loadFailed"));
      setState("error");
    }
  }, [t]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setState("saving"); setMessage("");
    try {
      const response = await fetch("/api/me/questionnaire", {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? t("saveFailed"));
      setState("saved"); setMessage(t("savedMessage"));
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : t("saveFailed"));
    }
  }

  if (state === "loading") return <Card className="mt-8 animate-pulse">{t("loading")}</Card>;
  if (state === "error") return <Alert title={t("unavailable")} tone="danger"><p>{message}</p><Button className="mt-3" onClick={() => { setState("loading"); void load(); }}>{actions("retry")}</Button></Alert>;
  const booleanFields = [
    ["has_fenced_yard", t("fencedYard")], ["has_children", t("children")],
    ["has_dogs", t("dogs")], ["can_administer_medication", t("medication")],
    ["can_provide_grooming", t("grooming")],
  ] as const;
  return (
    <form onSubmit={save} className="mt-8 space-y-6">
      <Card className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold">{t("housing")}
          <select className="mt-2 w-full rounded-xl border bg-white p-3" value={answers.housing_type} onChange={(event) => setAnswers({ ...answers, housing_type: event.target.value as Answers["housing_type"] })}>
            <option value="apartment">{t("apartment")}</option><option value="house">{t("house")}</option><option value="shared">{t("shared")}</option>
          </select>
        </label>
        <label className="text-sm font-bold">{t("homeSize")}
          <input className="mt-2 w-full rounded-xl border p-3" required min={1} max={2000} type="number" value={answers.usable_home_size_sqm} onChange={(event) => setAnswers({ ...answers, usable_home_size_sqm: Number(event.target.value) })} />
        </label>
        <label className="text-sm font-bold">{t("dailyCare")}
          <input className="mt-2 w-full rounded-xl border p-3" required min={0} max={24} step="0.5" type="number" value={answers.daily_care_hours} onChange={(event) => setAnswers({ ...answers, daily_care_hours: Number(event.target.value) })} />
        </label>
        <fieldset><legend className="text-sm font-bold">{t("preferredEnergy")}</legend><div className="mt-2 flex flex-wrap gap-3">
          {(["low", "medium", "high"] as const).map((energy) => <label key={energy} className="rounded-xl border px-3 py-2 text-sm"><input type="checkbox" checked={answers.preferred_energy_levels.includes(energy)} onChange={(event) => setAnswers({ ...answers, preferred_energy_levels: event.target.checked ? [...answers.preferred_energy_levels, energy] : answers.preferred_energy_levels.filter((item) => item !== energy) })} /> <span>{t(energy)}</span></label>)}
        </div></fieldset>
        <div className="space-y-3 sm:col-span-2">{booleanFields.map(([key, label]) => <label key={key} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={answers[key]} onChange={(event) => setAnswers({ ...answers, [key]: event.target.checked })} />{label}</label>)}</div>
      </Card>
      {message ? <Alert title={state === "saved" ? t("saved") : t("attention")} tone={state === "saved" ? "success" : "danger"}>{message}</Alert> : null}
      <Button type="submit" disabled={state === "saving" || answers.preferred_energy_levels.length === 0}>{state === "saving" ? t("saving") : t("save")}</Button>
    </form>
  );
}
