import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx("animate-pulse rounded-xl bg-line/60 motion-reduce:animate-none", className)}
    />
  );
}
