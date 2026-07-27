import Link from "next/link";
import { PetSubmitButton } from "@/components/foster/pet-submit-button";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function FosterPetsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("pets").select("id,name,status,review_status,updated_at").order("updated_at", { ascending: false });
  return (
    <PageShell eyebrow="PETS" title="我的毛孩">
      <Link href="/foster/pets/new" className="mt-6 inline-block font-semibold text-accent underline">新增毛孩</Link>
      <div className="mt-6 space-y-3">
        {(data ?? []).length === 0 ? <Card><p>尚未建立毛孩資料。</p></Card> : (data ?? []).map((pet) => (
          <Card key={pet.id} className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="font-semibold">{pet.name}</p><div className="mt-2 flex gap-2"><Badge>{pet.status}</Badge><Badge>{pet.review_status}</Badge></div></div>
            {pet.review_status !== "pending_review" ? <PetSubmitButton petId={pet.id} /> : <span className="text-sm text-muted">審核中</span>}
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
