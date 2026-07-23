import { Card } from "@/components/ui/card";

export function AdminStub({ title }: { title: string }) {
  return (
    <main className="w-full p-6 md:p-10">
      <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">Operations</p>
      <h1 className="display mt-2 text-4xl">{title}</h1>
      <Card className="mt-8 max-w-2xl">
        <p className="font-semibold">資料將在這裡顯示</p>
        <p className="mt-2 text-sm leading-6 text-muted">這是內部管理介面的起始畫面；後續可依角色權限串接真實資料。</p>
      </Card>
    </main>
  );
}
