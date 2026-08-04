import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

export function VerificationRow({
  name,
  verified,
}: {
  name: string;
  verified: boolean;
}) {
  const t = useTranslations("SharedPet");
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">{t("source")}</span>
      <span className="font-bold text-ink">{name}</span>
      <Badge
        variant={verified ? "success" : "pending"}
        icon={<span aria-hidden="true">{verified ? "✓" : "…"}</span>}
      >
        {verified ? t("verified") : t("verifying")}
      </Badge>
    </div>
  );
}
