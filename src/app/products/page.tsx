import Link from "next/link";

import { Card } from "@/components/ui/card";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "照護物資",
  description: "中途照護物資與日常用品目錄。讓照護需求被清楚看見，商品與結帳功能依試營運開關提供。",
  path: "/products",
});

const categories = [
  ["日常飲食", "飼料、罐頭與營養補充"],
  ["清潔照護", "尿墊、貓砂與日常清潔"],
  ["醫療支持", "復健、保健與照護用品"],
] as const;

export default function ProductsPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b bg-surface px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="latin-display text-2xl font-semibold">Pawtner</Link>
          <Link href="/foster/materials" className="text-sm font-bold text-accent">返回照護物資</Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-7 sm:py-16">
        <p className="eyebrow">CARE MATERIALS</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">照護物資</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">讓照護需求被清楚看見。商品與結帳功能仍受試營運開關控制，不會顯示虛構庫存。</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(([name, description], index) => (
            <Card key={name} tone={index === 1 ? "mint" : "surface"} className="min-h-56">
              <p className="latin-display text-3xl text-clay">0{index + 1}</p>
              <h2 className="display mt-8 text-2xl">{name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
              <p className="mt-7 text-sm font-bold text-accent">品項準備中</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
