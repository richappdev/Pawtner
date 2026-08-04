import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { MatchResult } from "@/lib/matching/score";
import { useTranslations } from "next-intl";

export function MatchExplanation({ result }: { result: MatchResult }) {
  const t = useTranslations("SharedPet");
  return (
    <Card tone="warm" className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("matchNotes")}</p>
          <h2 className="display mt-2 text-2xl">{t("whyMatch")}</h2>
        </div>
        <p className="latin-display text-4xl font-semibold text-clay">
          {result.score === null ? "—" : result.score}
        </p>
      </div>
      {result.reasons.length ? (
        <ul className="space-y-2 text-sm leading-6">
          {result.reasons.slice(0, 3).map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="font-bold text-accent" aria-hidden="true">✓</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-6 text-muted">{t("completePreferences")}</p>
      )}
      {result.risks.length || result.questions.length ? (
        <Alert title={t("confirmTogether")} tone="warning">
          {[...result.risks, ...result.questions].slice(0, 3).join("、")}
        </Alert>
      ) : null}
    </Card>
  );
}
