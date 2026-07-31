import { LegalStub } from "@/components/legal-stub";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("配送與退換貨說明", "/legal/shipping");

export default function ShippingPage() {
  return <LegalStub title="配送與退換貨說明" />;
}
