import Link from "next/link";

import { PrivacySettingsButton } from "@/components/privacy-settings-button";
import { legalPageMetadata } from "@/lib/seo";

export const metadata = legalPageMetadata("隱私權政策", "/legal/privacy");

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8 sm:px-7 sm:py-12">
      <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
      <article className="mt-14">
        <p className="eyebrow">PRIVACY</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">隱私權政策</h1>
        <p className="mt-5 text-sm leading-7 text-muted">最後更新：2026 年 7 月 31 日</p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-muted">
          <section>
            <h2 className="display text-2xl text-ink">我們收集哪些資料</h2>
            <p className="mt-3">
              Pawtner 的登入、認養與平台營運資料由 Firebase Authentication 與 Supabase 處理。只有在您明確同意後，
              我們才會啟用 Firebase Analytics 與 Firebase Performance，收集頁面類型、功能互動、寵物種類與來源等
              非敏感維度，以及頁面載入、網路請求和 Core Web Vitals 效能資料。
            </p>
          </section>

          <section>
            <h2 className="display text-2xl text-ink">我們不會送出的資料</h2>
            <p className="mt-3">
              分析事件不包含電子郵件、姓名、帳號識別碼、搜尋文字、寵物名稱、問卷答案、醫療內容或使用者輸入的
              精確地點。網址在送出前會移除查詢字串，動態資源路徑也會正規化。
            </p>
          </section>

          <section>
            <h2 className="display text-2xl text-ink">用途、處理者與保存</h2>
            <p className="mt-3">
              這些資料用於了解認養流程、改善網站體驗並找出效能問題。Firebase 與 Google Analytics 由 Google
              依其服務條款處理；Analytics 的事件層級資料保存期設定為 14 個月，廣告個人化與 Google Signals
              維持停用。匯出的彙總資料僅供授權的 Pawtner 維運人員存取。
            </p>
          </section>

          <section>
            <h2 className="display text-2xl text-ink">您的選擇</h2>
            <p className="mt-3">
              分析與效能收集預設關閉。您可以隨時允許或撤回同意；撤回後會停止未來的資料收集，且不影響登入、
              安全或其他必要功能。偏好只保存在目前瀏覽器中。
            </p>
            <div className="mt-5"><PrivacySettingsButton /></div>
          </section>

          <section>
            <h2 className="display text-2xl text-ink">聯絡我們</h2>
            <p className="mt-3">
              如需查詢、刪除或說明資料處理方式，請寄信至{" "}
              <a className="font-semibold text-accent underline" href="mailto:app.developer.rich@gmail.com">
                app.developer.rich@gmail.com
              </a>。
            </p>
          </section>
        </div>

        <Link href="/" className="mt-12 inline-block font-bold text-accent underline underline-offset-4">
          返回首頁
        </Link>
      </article>
    </main>
  );
}
