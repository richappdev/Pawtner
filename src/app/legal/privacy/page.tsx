import { LegalStub } from "@/components/legal-stub";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("隱私權政策", "/legal/privacy");

export default function PrivacyPage() {
  return <LegalStub title="隱私權政策" />;
}
