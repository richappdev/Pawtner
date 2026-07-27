import { PetCreateForm } from "@/components/foster/pet-create-form";
import { PageShell } from "@/components/page-shell";

export default function NewPetPage() {
  return <PageShell eyebrow="NEW PET" title="新增毛孩"><PetCreateForm /></PageShell>;
}
