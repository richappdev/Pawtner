import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getSessionActor } from "@/lib/auth/session-actor";

export default async function LoginPage() {
  const session = await getSessionActor();
  if (session) redirect("/explore");

  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <Link href="/" className="latin-display text-3xl font-semibold">Pawtner</Link>
        <div className="mt-14 max-w-md">
          <p className="eyebrow">WELCOME BACK</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">歡迎回來</h1>
          <p className="mt-4 leading-7 text-muted">登入後繼續整理收藏、生活偏好與領養申請。</p>
          <AuthForm mode="login" />
        </div>
      </section>
      <aside className="atmosphere hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <p className="eyebrow">A THOUGHTFUL MATCH</p>
        <blockquote className="display max-w-xl text-4xl leading-tight">「準備好」不是一時衝動，而是看懂彼此生活後，仍願意一起前進。</blockquote>
        <p className="max-w-md text-sm leading-6 text-muted">你的偏好只用來協助理解生活適配，不會取代中途的專業判斷與彼此溝通。</p>
      </aside>
    </main>
  );
}
