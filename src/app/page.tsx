import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="atmosphere relative flex min-h-screen overflow-hidden px-5 py-6">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <span className="display text-3xl font-semibold">Pawtner</span>
          <Link href="/login" className="text-sm font-semibold underline underline-offset-4">登入</Link>
        </header>
        <section className="max-w-2xl py-20 sm:py-28">
          <p className="mb-5 text-sm font-bold tracking-[0.18em] text-accent uppercase">Find your pawtner</p>
          <h1 className="display text-5xl leading-[0.95] tracking-tight sm:text-7xl">Pawtner</h1>
          <p className="display mt-5 max-w-xl text-3xl leading-tight sm:text-4xl">讓每次相遇，都更接近一個家。</p>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#4d4d47]">以清楚的資訊與貼近需求的推薦，陪你認識正在等待的毛孩。</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/explore" className="rounded-full bg-accent px-6 py-3 text-center font-semibold text-white hover:bg-[#094b41]">探索毛孩</Link>
            <Link href="/foster" className="rounded-full border border-[#1a1a18] px-6 py-3 text-center font-semibold hover:bg-white/60">我是中途</Link>
          </div>
        </section>
        <p className="text-sm text-muted">AI 寵物領養與中途支持</p>
      </div>
    </main>
  );
}
