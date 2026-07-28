import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  interactive = false,
  tone = "surface",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  tone?: "surface" | "sage" | "mint" | "warm" | "neutral";
}) {
  return (
    <div
      className={clsx(
        "rounded-[20px] border p-5",
        tone === "surface" && "bg-surface shadow-[var(--shadow-soft)]",
        tone === "sage" && "border-transparent bg-sage/60",
        tone === "mint" && "border-transparent bg-mint",
        tone === "warm" && "border-transparent bg-[#faeee8]",
        tone === "neutral" && "bg-surface-soft",
        interactive && "lift-on-hover",
        className,
      )}
      {...props}
    />
  );
}
