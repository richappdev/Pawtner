import { clsx } from "clsx";

export function ProcessStepper({
  steps,
  current,
}: {
  steps: readonly string[];
  current: number;
}) {
  return (
    <ol aria-label="領養流程" className="grid gap-3 sm:grid-cols-4">
      {steps.map((step, index) => {
        const complete = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className={clsx(
              "rounded-[14px] border p-3 text-sm",
              complete && "border-transparent bg-mint text-accent",
              active && "border-accent bg-surface font-bold text-ink",
              !complete && !active && "bg-surface-soft text-muted",
            )}
          >
            <span className="mr-2 font-bold">{complete ? "✓" : index + 1}</span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
