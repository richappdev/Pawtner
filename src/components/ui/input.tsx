import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "min-h-12 w-full rounded-xl border bg-white px-4 text-base outline-none placeholder:text-[#929289] focus:border-accent focus:ring-2 focus:ring-[#0f6b5c]/15",
        className,
      )}
      {...props}
    />
  );
}
