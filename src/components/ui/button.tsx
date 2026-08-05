import { clsx } from "clsx";

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "warm" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return clsx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] font-semibold transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "px-4 text-sm",
    size === "md" && "px-5 py-3 text-sm",
    size === "lg" && "min-h-12 px-6 py-3 text-base",
    variant === "primary" && "bg-accent text-white hover:bg-accent-deep",
    variant === "secondary" && "border bg-surface text-accent hover:bg-mint",
    variant === "warm" && "bg-clay text-white hover:bg-[#b94f36]",
    variant === "quiet" && "text-accent hover:bg-mint",
    variant === "danger" && "bg-[var(--danger-fg)] text-white hover:opacity-90",
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ComponentProps<typeof Link> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
