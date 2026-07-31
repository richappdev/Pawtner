import { LegalStub } from "@/components/legal-stub";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("服務條款", "/legal/terms");

export default function TermsPage() {
  return <LegalStub title="服務條款" />;
}
