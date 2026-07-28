import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { Alert } from "@/components/ui/alert";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <Link href="/" className="latin-display text-3xl font-semibold">Pawtner</Link>
        <div className="mt-14 max-w-md">
          <p className="eyebrow">CLOSED PILOT</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">開始認識毛孩</h1>
          <p className="mt-4 leading-7 text-muted">建立帳號後，從生活條件與照護準備開始，慢慢找到適合彼此的關係。</p>
          {invite ? (
            <AuthForm mode="signup" inviteToken={invite} />
          ) : (
            <div className="mt-8">
              <Alert title="目前採邀請制" tone="warning">
                Pawtner 正在封閉試營運。請使用合作團隊提供的完整邀請連結註冊。
              </Alert>
            </div>
          )}
        </div>
      </section>
      <aside className="hidden bg-sage/65 p-12 lg:flex lg:flex-col lg:justify-between">
        <p className="eyebrow">WHAT WE VALUE</p>
        <div className="space-y-7">
          {["真實資料", "負責任的適配", "透明流程", "領養後支持"].map((item, index) => (
            <div key={item} className="border-b border-ink/15 pb-5">
              <span className="latin-display mr-4 text-2xl text-clay">0{index + 1}</span>
              <span className="display text-2xl">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">讓每次相遇，都更接近一個家。</p>
      </aside>
    </main>
  );
}
