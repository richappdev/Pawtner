import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-3xl border bg-white p-5 shadow-[0_8px_30px_rgb(26_26_24/0.04)]",
        className,
      )}
      {...props}
    />
  );
}
