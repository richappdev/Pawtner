import { AdminNav } from "@/components/nav/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen md:flex"><AdminNav />{children}</div>;
}
