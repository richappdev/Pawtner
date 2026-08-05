import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedLegalPageMetadata("disputes", "/legal/disputes"); }

export default function DisputesPage() {
  return <LegalStub titleKey="disputes" />;
}
