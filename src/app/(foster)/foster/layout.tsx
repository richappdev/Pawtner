import { FosterNav } from "@/components/nav/foster-nav";

export default function FosterLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen lg:flex"><FosterNav /><div className="min-w-0 flex-1">{children}</div></div>;
}
