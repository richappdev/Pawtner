import { clsx } from "clsx";

export function Alert({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children?: React.ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx(
        "rounded-[16px] border px-4 py-3 text-sm",
        tone === "info" && "border-sage bg-mint text-ink",
        tone === "success" && "border-transparent bg-[var(--success-bg)] text-[var(--success-fg)]",
        tone === "warning" && "border-transparent bg-[var(--pending-bg)] text-[var(--pending-fg)]",
        tone === "danger" && "border-transparent bg-[var(--danger-bg)] text-[var(--danger-fg)]",
      )}
    >
      <p className="font-bold">{title}</p>
      {children ? <div className="mt-1 leading-6">{children}</div> : null}
    </div>
  );
}
