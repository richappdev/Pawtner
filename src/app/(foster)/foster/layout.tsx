import type { Metadata } from "next";

import { FosterNav } from "@/components/nav/foster-nav";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function FosterLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen lg:flex"><FosterNav /><div className="min-w-0 flex-1">{children}</div></div>;
}
