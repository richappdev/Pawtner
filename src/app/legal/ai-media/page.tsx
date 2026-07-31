import { LegalStub } from "@/components/legal-stub";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("AI 與媒體使用說明", "/legal/ai-media");

export default function AiMediaPage() {
  return <LegalStub title="AI 與媒體使用說明" />;
}
