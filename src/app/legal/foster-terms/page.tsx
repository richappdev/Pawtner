import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedLegalPageMetadata("fosterTerms", "/legal/foster-terms"); }

export default function FosterTermsPage() {
  return <LegalStub titleKey="fosterTerms" />;
}
