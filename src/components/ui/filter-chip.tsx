import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export function FilterChip({
  selected = false,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition",
        selected ? "border-accent bg-mint text-accent" : "bg-surface text-muted hover:border-sage hover:text-ink",
        className,
      )}
      {...props}
    >
      {selected ? <span aria-hidden="true">✓</span> : null}
      {children}
    </button>
  );
}
