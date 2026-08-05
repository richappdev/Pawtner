import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedLegalPageMetadata("adoptionDeclaration", "/legal/adoption-declaration"); }

export default function AdoptionDeclarationPage() {
  return <LegalStub titleKey="adoptionDeclaration" />;
}
