import { LegalStub } from "@/components/legal-stub";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("中途合作條款", "/legal/foster-terms");

export default function FosterTermsPage() {
  return <LegalStub title="中途合作條款" />;
}
