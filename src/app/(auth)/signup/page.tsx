import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="display text-3xl">Pawtner</Link>
      <h1 className="display mt-12 text-4xl">開始認識毛孩</h1>
      <p className="mt-2 leading-7 text-muted">建立帳號，保存你的喜歡與領養申請。</p>
      {invite ? (
        <AuthForm mode="signup" inviteToken={invite} />
      ) : (
        <p className="mt-8 rounded-xl border border-[#d7e4e0] bg-white p-4 text-sm leading-6 text-muted">
          Pawtner 封閉測試採邀請制。請使用管理員提供的邀請連結建立帳號。
        </p>
      )}
    </main>
  );
}
