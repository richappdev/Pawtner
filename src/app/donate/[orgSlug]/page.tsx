import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function DonateRedirectPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-5 py-12">
      <Badge>外部公益專案</Badge>
      <h1 className="display mt-4 text-4xl">前往組織公開頁面</h1>
      <dl className="mt-8 space-y-5 border-y py-6 text-sm">
        <div><dt className="text-muted">組織</dt><dd className="mt-1 font-semibold">{orgSlug}</dd></div>
        <div><dt className="text-muted">專案</dt><dd className="mt-1 font-semibold">請於組織公開頁確認</dd></div>
        <div><dt className="text-muted">勸募許可字號與效期</dt><dd className="mt-1 font-semibold">請於組織公開頁確認</dd></div>
      </dl>
      <p className="mt-6 leading-7 text-muted">Pawtner 不代收私人募款，也不處理捐款金流；若選擇支持，將由你直接前往該組織的公開連結。</p>
      <Link href="https://saturn.syg.org.tw/" target="_blank" rel="noopener noreferrer" className="mt-8 block rounded-full bg-accent px-5 py-3 text-center font-semibold text-white">查詢公益勸募資訊</Link>
    </main>
  );
}
