import { Badge } from "@/components/ui/badge";

export function VerificationRow({
  name,
  verified,
}: {
  name: string;
  verified: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">資料來源</span>
      <span className="font-bold text-ink">{name}</span>
      <Badge
        variant={verified ? "success" : "pending"}
        icon={<span aria-hidden="true">{verified ? "✓" : "…"}</span>}
      >
        {verified ? "合作組織已驗證" : "來源確認中"}
      </Badge>
    </div>
  );
}
