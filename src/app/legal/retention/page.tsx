import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedLegalPageMetadata("retention", "/legal/retention"); }

export default function RetentionPage() {
  return <LegalStub titleKey="retention" />;
}
