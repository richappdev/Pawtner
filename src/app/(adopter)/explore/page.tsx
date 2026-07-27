import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("pets_public").select("*").order("published_at", { ascending: false }).limit(48);
  return (
    <PageShell eyebrow="EXPLORE" title="遇見正在等家的牠">
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(data ?? []).map((pet) => (
          <Card key={pet.id}>
            <div className="flex gap-2"><Badge>{pet.species}</Badge><Badge>{pet.region ?? "地區待確認"}</Badge></div>
            <h2 className="display mt-4 text-2xl">{pet.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{pet.personality_summary ?? "等待中途補充介紹"}</p>
            <Link href={`/pets/${pet.id}`} className="mt-4 inline-block font-semibold text-accent underline">查看資料</Link>
          </Card>
        ))}
        {(data ?? []).length === 0 ? <Card><p>目前沒有已核准刊登的毛孩。</p></Card> : null}
      </div>
    </PageShell>
  );
}
