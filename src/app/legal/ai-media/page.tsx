import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedLegalPageMetadata("aiMedia", "/legal/ai-media"); }

export default function AiMediaPage() {
  return <LegalStub titleKey="aiMedia" />;
}
