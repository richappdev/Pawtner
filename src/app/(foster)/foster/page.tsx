import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function FosterOverviewPage() {
  return <PageShell eyebrow="FOSTER SPACE" title="今天，照顧得還好嗎？"><p className="mt-4 leading-7 text-muted">在這裡整理毛孩資料、申請與需要的物資。</p><Link href="/foster/pets/new" className="mt-8 inline-block rounded-full bg-accent px-5 py-3 font-semibold text-white">新增毛孩</Link></PageShell>;
}
