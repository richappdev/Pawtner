import { LegalStub } from "@/components/legal-stub";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("電子商務條款", "/legal/commerce");

export default function CommercePage() {
  return <LegalStub title="電子商務條款" />;
}
