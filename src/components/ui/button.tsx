import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-white hover:bg-[#094b41]",
        variant === "secondary" && "border border-[#1a1a18] bg-transparent text-foreground hover:bg-[#1a1a18] hover:text-white",
        variant === "quiet" && "text-accent hover:bg-[#e4f0ed]",
        className,
      )}
      {...props}
    />
  );
}
