import { PageShell } from "@/components/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NewPetPage() {
  return <PageShell eyebrow="NEW PET" title="新增毛孩"><form className="mt-8 space-y-4"><label className="block text-sm font-semibold">名字<Input className="mt-2" placeholder="例如：小橘" /></label><label className="block text-sm font-semibold">一句介紹<Input className="mt-2" placeholder="牠喜歡什麼？" /></label><Button type="button" className="w-full">儲存草稿</Button></form></PageShell>;
}
