import { LegalStub } from "@/components/legal-stub";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("領養聲明", "/legal/adoption-declaration");

export default function AdoptionDeclarationPage() {
  return <LegalStub title="領養聲明" />;
}
