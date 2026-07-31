import { LegalStub } from "@/components/legal-stub";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("資料保存政策", "/legal/retention");

export default function RetentionPage() {
  return <LegalStub title="資料保存政策" />;
}
