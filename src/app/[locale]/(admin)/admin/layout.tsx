import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AdminNav } from "@/components/nav/admin-nav";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSessionActor } from "@/lib/auth/session-actor";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [navigation, t] = await Promise.all([getTranslations("Navigation"), getTranslations("Admin")]);
  const session = await getSessionActor();
  if (!session) {
    redirect("/login");
  }

  if (!canAccessAdmin(session.actor)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
        <p className="text-sm font-bold tracking-[0.16em] text-accent uppercase">{navigation("operations")}</p>
        <h1 className="display mt-2 text-4xl">{t("accessDenied")}</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          {t("accessDeniedDescription")}
        </p>
        <Link href="/" className="mt-8 text-sm font-semibold text-accent underline underline-offset-4">
          {t("backHome")}
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
