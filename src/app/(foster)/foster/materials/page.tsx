import Link from "next/link";
import { PageShell } from "@/components/page-shell";
export default function FosterMaterialsPage() { return <PageShell eyebrow="MATERIALS" title="照護物資"><p className="mt-4 leading-7 text-muted">需要的照護物資與採購紀錄都會在這裡。</p><Link href="/products" className="mt-8 inline-block rounded-full bg-accent px-5 py-3 font-semibold text-white">瀏覽物資</Link></PageShell>; }
