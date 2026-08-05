import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedLegalPageMetadata("terms", "/legal/terms"); }

export default function TermsPage() {
  return <LegalStub titleKey="terms" />;
}
