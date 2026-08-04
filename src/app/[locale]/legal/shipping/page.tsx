import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) { return localizedLegalPageMetadata((await params).locale, "shipping", "/legal/shipping"); }

export default function ShippingPage() {
  return <LegalStub titleKey="shipping" />;
}
