import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedLegalPageMetadata("commerce", "/legal/commerce"); }

export default function CommercePage() {
  return <LegalStub titleKey="commerce" />;
}
