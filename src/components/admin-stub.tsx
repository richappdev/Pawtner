import { Card } from "@/components/ui/card";

export function AdminStub({ title }: { title: string }) {
  return (
    <main className="w-full p-6 md:p-10">
      <p className="eyebrow">OPERATIONS</p>
      <h1 className="display mt-2 text-4xl">{title}</h1>
      <Card tone="neutral" className="mt-8 max-w-3xl">
        <p className="font-bold">這個營運模組尚未啟用</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          封閉試營運會先聚焦毛孩資料審核與參與者管理。功能完成前，這裡不會顯示模擬數據或無法使用的操作。
        </p>
      </Card>
    </main>
  );
}
