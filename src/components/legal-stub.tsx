import Link from "next/link";

export function LegalStub({ title }: { title: string }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-12">
      <Link href="/" className="display text-2xl">Pawtner</Link>
      <p className="mt-12 text-sm font-bold tracking-[0.16em] text-accent uppercase">Legal</p>
      <h1 className="display mt-2 text-4xl">{title}</h1>
      <p className="mt-8 rounded-xl border border-dashed p-4 text-sm font-semibold text-muted">待法務審查</p>
      <p className="mt-6 leading-8 text-muted">本頁為臺灣服務上線前的條款草案位置。正式內容將於法務審查、資料處理與相關法令確認後公告。</p>
    </main>
  );
}
