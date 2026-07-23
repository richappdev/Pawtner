import { FosterNav } from "@/components/nav/foster-nav";

export default function FosterLayout({ children }: { children: React.ReactNode }) {
  return <><FosterNav />{children}</>;
}
