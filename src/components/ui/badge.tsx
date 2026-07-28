import { clsx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "pending"
  | "process"
  | "adopted"
  | "danger"
  | "warm";

export function Badge({
  className,
  variant = "neutral",
  icon,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  icon?: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        variant === "neutral" && "bg-surface-soft text-muted",
        variant === "success" && "bg-[var(--success-bg)] text-[var(--success-fg)]",
        variant === "pending" && "bg-[var(--pending-bg)] text-[var(--pending-fg)]",
        variant === "process" && "bg-[var(--process-bg)] text-[var(--process-fg)]",
        variant === "adopted" && "bg-[var(--adopted-bg)] text-[var(--adopted-fg)]",
        variant === "danger" && "bg-[var(--danger-bg)] text-[var(--danger-fg)]",
        variant === "warm" && "bg-[#f9e2d9] text-[#8d3e2b]",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
