import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthForm } from "@/components/auth-form";
import { getSessionActor } from "@/lib/auth/session-actor";
import { noIndexRobots, localizedPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }) { return localizedPageMetadata((await params).locale, "loginTitle", "/login", { robots: noIndexRobots }); }

export default async function LoginPage() {
  const session = await getSessionActor();
  if (session) redirect("/explore");
  const t = await getTranslations("Auth");

  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <Link href="/" className="latin-display text-3xl font-semibold">Pawtner</Link>
        <div className="mt-14 max-w-md">
          <p className="eyebrow">{t("welcomeEyebrow")}</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">{t("welcomeTitle")}</h1>
          <p className="mt-4 leading-7 text-muted">{t("welcomeDescription")}</p>
          <AuthForm mode="login" />
        </div>
      </section>
      <aside className="atmosphere hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <p className="eyebrow">{t("matchEyebrow")}</p>
        <blockquote className="display max-w-xl text-4xl leading-tight">{t("quote")}</blockquote>
        <p className="max-w-md text-sm leading-6 text-muted">{t("matchDescription")}</p>
      </aside>
    </main>
  );
}
