"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [answers, setAnswers] = useState(initial);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/me/questionnaire", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Unable to load questionnaire.");
      if (payload.data.response?.answers) setAnswers(payload.data.response.answers);
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load questionnaire.");
      setState("error");
    }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setState("saving"); setMessage("");
    try {
      const response = await fetch("/api/me/questionnaire", {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Unable to save questionnaire.");
      setState("saved"); setMessage("Questionnaire saved. Your recommendations are ready.");
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "Unable to save questionnaire.");
    }
  }

  if (state === "loading") return <Card className="mt-8 animate-pulse">Loading your questionnaire…</Card>;
  if (state === "error" && !message.includes("save")) return <Alert title="Questionnaire unavailable" tone="danger"><p>{message}</p><Button className="mt-3" onClick={() => { setState("loading"); void load(); }}>Retry</Button></Alert>;
  const booleanFields = [
    ["has_fenced_yard", "Secure fenced yard"], ["has_children", "Children live in the household"],
    ["has_dogs", "Dogs live in the household"], ["can_administer_medication", "Can administer prescribed medication"],
    ["can_provide_grooming", "Can provide regular grooming"],
  ] as const;
  return (
    <form onSubmit={save} className="mt-8 space-y-6">
      <Card className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold">Housing
          <select className="mt-2 w-full rounded-xl border bg-white p-3" value={answers.housing_type} onChange={(event) => setAnswers({ ...answers, housing_type: event.target.value as Answers["housing_type"] })}>
            <option value="apartment">Apartment</option><option value="house">House</option><option value="shared">Shared home</option>
          </select>
        </label>
        <label className="text-sm font-bold">Usable home size (m²)
          <input className="mt-2 w-full rounded-xl border p-3" required min={1} max={2000} type="number" value={answers.usable_home_size_sqm} onChange={(event) => setAnswers({ ...answers, usable_home_size_sqm: Number(event.target.value) })} />
        </label>
        <label className="text-sm font-bold">Daily care time (hours)
          <input className="mt-2 w-full rounded-xl border p-3" required min={0} max={24} step="0.5" type="number" value={answers.daily_care_hours} onChange={(event) => setAnswers({ ...answers, daily_care_hours: Number(event.target.value) })} />
        </label>
        <fieldset><legend className="text-sm font-bold">Preferred energy</legend><div className="mt-2 flex flex-wrap gap-3">
          {(["low", "medium", "high"] as const).map((energy) => <label key={energy} className="rounded-xl border px-3 py-2 text-sm"><input type="checkbox" checked={answers.preferred_energy_levels.includes(energy)} onChange={(event) => setAnswers({ ...answers, preferred_energy_levels: event.target.checked ? [...answers.preferred_energy_levels, energy] : answers.preferred_energy_levels.filter((item) => item !== energy) })} /> <span className="capitalize">{energy}</span></label>)}
        </div></fieldset>
        <div className="space-y-3 sm:col-span-2">{booleanFields.map(([key, label]) => <label key={key} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={answers[key]} onChange={(event) => setAnswers({ ...answers, [key]: event.target.checked })} />{label}</label>)}</div>
      </Card>
      {message ? <Alert title={state === "saved" ? "Saved" : "Needs attention"} tone={state === "saved" ? "success" : "danger"}>{message}</Alert> : null}
      <Button type="submit" disabled={state === "saving" || answers.preferred_energy_levels.length === 0}>{state === "saving" ? "Saving…" : "Save questionnaire"}</Button>
    </form>
  );
}
