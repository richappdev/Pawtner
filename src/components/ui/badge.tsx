import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full bg-[#e4f0ed] px-2.5 py-1 text-xs font-semibold text-[#094b41]",
        className,
      )}
      {...props}
    />
  );
}
