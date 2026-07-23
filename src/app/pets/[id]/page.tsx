import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-5 py-8">
      <Link href="/explore" className="text-sm font-semibold text-accent">← 返回探索</Link>
      <div className="atmosphere mt-6 aspect-[4/3] rounded-3xl" aria-label="毛孩照片區域" />
      <Badge className="mt-6">等待認識</Badge>
      <h1 className="display mt-3 text-5xl">毛孩 #{id}</h1>
      <p className="mt-4 leading-8 text-muted">完整的健康、個性與相處資訊將由中途公開後顯示在這裡。</p>
      <Link href="/login" className="mt-8 block rounded-full bg-accent px-5 py-3 text-center font-semibold text-white">登入後申請認識</Link>
    </main>
  );
}
