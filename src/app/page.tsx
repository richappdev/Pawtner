import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { PetCard } from "@/components/pet-card";
import { PetListAnalytics } from "@/components/adoption-analytics";
import { PetCover } from "@/components/pet-media";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSessionActor } from "@/lib/auth/session-actor";
import { listPublicPets } from "@/lib/pets/public-data";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  absoluteUrl,
  pageMetadata,
} from "@/lib/seo";

export const metadata = pageMetadata({
  title: { absolute: DEFAULT_TITLE },
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

export default async function LandingPage() {
  const [session, pets] = await Promise.all([
    getSessionActor(),
    listPublicPets(3).catch(() => []),
  ]);
  const showAdminPets = session ? canAccessAdmin(session.actor) : false;

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: absoluteUrl("/"),
          description: DEFAULT_DESCRIPTION,
          email: "app.developer.rich@gmail.com",
        }}
      />
      <section className="atmosphere min-h-[92vh] overflow-hidden px-5 py-6">
        <div className="mx-auto flex min-h-[calc(92vh-3rem)] max-w-7xl flex-col">
          <header className="flex items-center justify-between">
            <Link href="/" className="latin-display text-3xl font-semibold">Pawtner</Link>
            <nav aria-label="主要導覽" className="flex items-center gap-2">
              {showAdminPets ? <ButtonLink href="/admin" variant="quiet">管理後台</ButtonLink> : null}
              <ButtonLink href={session ? "/explore" : "/login"} variant="secondary">
                {session ? "進入 Pawtner" : "登入"}
              </ButtonLink>
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div className="max-w-2xl">
              <p className="eyebrow">A WARM RECORD OF A REAL LIFE</p>
              <h1 className="display mt-5 text-5xl leading-[1.08] sm:text-6xl lg:text-7xl">
                讓每次相遇，
                <span className="block text-accent">都更接近一個家。</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
                不只看見可愛，更看懂牠的生活、需要與適合的家。用透明資料與負責任的媒合，陪你慢慢做出重要決定。
              </p>
              <form action="/explore" className="mt-8 flex max-w-xl flex-col gap-3 rounded-[18px] bg-surface p-3 shadow-[var(--shadow-soft)] sm:flex-row">
                <label className="sr-only" htmlFor="home-search">搜尋地區、名字或品種</label>
                <input
                  id="home-search"
                  name="q"
                  placeholder="搜尋地區、名字或品種"
                  className="min-h-12 flex-1 rounded-xl px-4 outline-none"
                />
                <button className="min-h-12 rounded-xl bg-accent px-6 font-bold text-white hover:bg-accent-deep">
                  探索毛孩
                </button>
              </form>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-semibold">
                <Link href="/foster" className="text-accent underline underline-offset-4">我是中途照護者</Link>
                <span className="text-muted">資料來源清楚・狀態透明・不以罪惡感催促</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -left-5 -top-5 h-36 w-36 rounded-[38%] bg-clay/80" aria-hidden="true" />
              <div className="absolute -bottom-6 -right-5 h-44 w-44 rounded-full bg-apricot/80" aria-hidden="true" />
              <PetCover
                media={pets[0]?.coverMedia ?? null}
                name={pets[0]?.name ?? "等待相遇的毛孩"}
                priority
                className="relative aspect-[4/3] rounded-[28px] border-[10px] border-surface shadow-[var(--shadow-lift)]"
              />
              <Card className="absolute -bottom-8 left-5 right-5 sm:left-auto sm:w-72">
                <p className="eyebrow">LIFE RECORD</p>
                <p className="display mt-2 text-xl">{pets[0]?.name ?? "每一份資料，都代表一個生命"}</p>
                <p className="mt-2 text-sm leading-6 text-muted">認識牠的日常、健康、個性與資料來源，再決定下一步。</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-px overflow-hidden rounded-[24px] border bg-line md:grid-cols-3">
            {[
              ["01", "先認識真實生活", "照片之外，也看見照護紀錄、活動量與家庭條件。"],
              ["02", "理解為何適合", "推薦會說明理由、疑問，以及目前還缺少的資訊。"],
              ["03", "清楚知道下一步", "從表達興趣到見面與試養，每個狀態都能看懂。"],
            ].map(([number, title, description], index) => (
              <div key={number} className={index === 1 ? "bg-mint p-7" : "bg-surface p-7"}>
                <p className="latin-display text-3xl text-clay">{number}</p>
                <h2 className="display mt-5 text-2xl">{title}</h2>
                <p className="mt-3 leading-7 text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">MEET THEM</p>
              <h2 className="display mt-2 text-4xl">正在等待被認識的牠</h2>
            </div>
            <ButtonLink href="/explore" variant="secondary">查看全部毛孩</ButtonLink>
          </div>
          {pets.length ? (
            <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <PetListAnalytics listId="home_featured" resultCount={pets.length} />
              {pets.map((pet) => <PetCard key={pet.id} pet={pet} listId="home_featured" />)}
            </div>
          ) : (
            <Card tone="mint" className="mt-9">
              <h3 className="display text-2xl">公開資料正在準備中</h3>
              <p className="mt-3 leading-7 text-muted">合作中途確認資料後，毛孩會出現在這裡。你仍可以先了解領養流程。</p>
            </Card>
          )}
        </div>
      </section>

      <footer className="border-t bg-surface px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="latin-display text-2xl">Pawtner</p>
            <p className="mt-1 text-sm text-muted">AI 寵物領養與中途支持</p>
            <a
              href="mailto:app.developer.rich@gmail.com"
              className="mt-2 inline-block text-sm font-semibold text-accent underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current"
            >
              app.developer.rich@gmail.com
            </a>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-semibold text-muted">
            <Link href="/legal/privacy">隱私權</Link>
            <Link href="/legal/terms">服務條款</Link>
            <Link href="/legal/ai-media">AI 與媒體說明</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
