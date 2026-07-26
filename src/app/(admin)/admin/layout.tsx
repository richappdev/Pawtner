import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/nav/admin-nav";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSessionActor } from "@/lib/auth/session-actor";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionActor();
  if (!session) {
    redirect("/login");
  }

  if (!canAccessAdmin(session.actor)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
        <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">Operations</p>
        <h1 className="display mt-2 text-4xl">沒有權限</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          此區域僅限管理員存取。若你認為這是錯誤，請聯繫平台管理員。
        </p>
        <Link href="/" className="mt-8 text-sm font-semibold text-accent underline underline-offset-4">
          返回首頁
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      <AdminNav />
      {children}
    </div>
  );
}
