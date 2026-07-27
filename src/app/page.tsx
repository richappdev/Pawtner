import Link from "next/link";

import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSessionActor } from "@/lib/auth/session-actor";

function AdminPetsIconLink() {
  return (
    <Link
      href="/admin/pets"
      aria-label="管理毛孩"
      title="管理毛孩"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1a1a18]/15 text-accent transition hover:bg-white/70"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path
          d="M12 3.5c1.2 0 2.2.9 2.2 2.1 0 1.5-1.3 2.4-2.2 3.4-.9-1-2.2-1.9-2.2-3.4 0-1.2 1-2.1 2.2-2.1Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M7.2 7.2c1.1 0 1.9.9 1.9 1.9S8 11 7.2 11 5.3 10.1 5.3 9.1s.8-1.9 1.9-1.9Zm9.6 0c1.1 0 1.9.9 1.9 1.9S18 11 16.8 11s-1.9-.9-1.9-1.9.8-1.9 1.9-1.9ZM5.8 12.4c1.2 0 2.1 1 2.1 2.2s-1 2.1-2.1 2.1-2.2-1-2.2-2.1 1-2.2 2.2-2.2Zm12.4 0c1.2 0 2.2 1 2.2 2.2s-1 2.1-2.2 2.1-2.1-1-2.1-2.1 1-2.2 2.1-2.2Z"
          fill="currentColor"
        />
        <path
          d="M12 11.2c2.6 0 4.7 2.4 4.7 4.6 0 1.7-1.5 2.7-4.7 2.7s-4.7-1-4.7-2.7c0-2.2 2.1-4.6 4.7-4.6Z"
          fill="currentColor"
        />
      </svg>
    </Link>
  );
}

export default async function LandingPage() {
  const session = await getSessionActor();
  const showAdminPets = session ? canAccessAdmin(session.actor) : false;
  const isLoggedIn = session !== null;

  return (
    <main className="atmosphere relative flex min-h-screen overflow-hidden px-5 py-6">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <span className="display text-3xl font-semibold">Pawtner</span>
          <div className="flex items-center gap-3">
            {showAdminPets ? <AdminPetsIconLink /> : null}
            <Link
              href={isLoggedIn ? "/explore" : "/login"}
              className="text-sm font-semibold underline underline-offset-4"
            >
              {isLoggedIn ? "進入主頁" : "登入"}
            </Link>
          </div>
        </header>
        <section className="max-w-2xl py-20 sm:py-28">
          <p className="mb-5 text-sm font-bold tracking-[0.18em] text-accent uppercase">Find your pawtner</p>
          <h1 className="display text-5xl leading-[0.95] tracking-tight sm:text-7xl">Pawtner</h1>
          <p className="display mt-5 max-w-xl text-3xl leading-tight sm:text-4xl">讓每次相遇，都更接近一個家。</p>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#4d4d47]">
            以清楚的資訊與貼近需求的推薦，陪你認識正在等待的毛孩。
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/explore"
              className="rounded-full bg-accent px-6 py-3 text-center font-semibold text-white hover:bg-[#094b41]"
            >
              探索毛孩
            </Link>
            <Link
              href="/foster"
              className="rounded-full border border-[#1a1a18] px-6 py-3 text-center font-semibold hover:bg-white/60"
            >
              我是中途
            </Link>
          </div>
        </section>
        <p className="text-sm text-muted">AI 寵物領養與中途支持</p>
      </div>
    </main>
  );
}
