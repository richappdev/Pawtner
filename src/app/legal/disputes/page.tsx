import { LegalStub } from "@/components/legal-stub";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("爭議處理辦法", "/legal/disputes");

export default function DisputesPage() {
  return <LegalStub title="爭議處理辦法" />;
}
