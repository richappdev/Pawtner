import { Card } from "@/components/ui/card";

export default function ProductsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">Materials</p>
      <h1 className="display mt-2 text-4xl">照護物資</h1>
      <p className="mt-3 max-w-xl leading-7 text-muted">為中途照護挑選需要的用品。這裡是商品目錄，並非募款頁面。</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["清潔與消毒", "日常飲食", "外出照護"].map((name) => <Card key={name}><p className="font-semibold">{name}</p><p className="mt-2 text-sm text-muted">商品即將上架。</p></Card>)}
      </div>
    </main>
  );
}
