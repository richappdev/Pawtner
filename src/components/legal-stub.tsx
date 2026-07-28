import Link from "next/link";

import { Alert } from "@/components/ui/alert";

export function LegalStub({ title }: { title: string }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8 sm:px-7 sm:py-12">
      <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
      <div className="mt-14 grid gap-10 md:grid-cols-[13rem_1fr]">
        <div>
          <p className="eyebrow">LEGAL RECORD</p>
          <p className="mt-3 text-sm leading-6 text-muted">透明流程的一部分，是讓規則可以被找到、讀懂與再次確認。</p>
        </div>
        <article>
          <h1 className="display text-4xl sm:text-5xl">{title}</h1>
          <div className="mt-8">
            <Alert title="正式內容準備中" tone="warning">
              這個頁面保留給正式政策文件。目前請勿將此頁視為完整法律條款；封閉試營運期間如有疑問，請直接聯繫 Pawtner 團隊。
            </Alert>
          </div>
          <section className="mt-9 border-t pt-8">
            <h2 className="display text-2xl">我們會清楚說明</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
              <li>資料如何使用、保存與刪除</li>
              <li>領養、中途、捐款或交易流程中的責任</li>
              <li>AI 與媒體內容如何產生、審核與標示</li>
            </ul>
          </section>
          <Link href="/" className="mt-10 inline-block font-bold text-accent underline underline-offset-4">回到首頁</Link>
        </article>
      </div>
    </main>
  );
}
