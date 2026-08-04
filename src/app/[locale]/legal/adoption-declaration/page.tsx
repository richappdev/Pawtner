import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) { return localizedLegalPageMetadata((await params).locale, "adoptionDeclaration", "/legal/adoption-declaration"); }

export default function AdoptionDeclarationPage() {
  return <LegalStub titleKey="adoptionDeclaration" />;
}
