import { LegalStub } from "@/components/legal-stub";
import { localizedLegalPageMetadata } from "@/lib/seo";
export async function generateMetadata() { return localizedLegalPageMetadata("shipping", "/legal/shipping"); }

export default function ShippingPage() {
  return <LegalStub titleKey="shipping" />;
}
