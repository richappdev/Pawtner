import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { MatchResult } from "@/lib/matching/score";

export function MatchExplanation({ result }: { result: MatchResult }) {
  return (
    <Card tone="warm" className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">MATCH NOTES</p>
          <h2 className="display mt-2 text-2xl">為什麼可能適合你</h2>
        </div>
        <p className="latin-display text-4xl font-semibold text-clay">{result.score}</p>
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
        <p className="text-sm leading-6 text-muted">完成生活偏好後，我們會在這裡說明適配原因。</p>
      )}
      {result.risks.length || result.questions.length ? (
        <Alert title="還需要一起確認" tone="warning">
          {[...result.risks, ...result.questions].slice(0, 3).join("、")}
        </Alert>
      ) : null}
    </Card>
  );
}
