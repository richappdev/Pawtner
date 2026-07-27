import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getSessionActor } from "@/lib/auth/session-actor";

export default async function LoginPage() {
  const session = await getSessionActor();
  if (session) {
    redirect("/explore");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="display text-3xl">Pawtner</Link>
      <h1 className="display mt-12 text-4xl">歡迎回來</h1>
      <p className="mt-2 leading-7 text-muted">登入後繼續認識你的毛孩夥伴。</p>
      <AuthForm mode="login" />
    </main>
  );
}
