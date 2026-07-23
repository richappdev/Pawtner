"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";

  async function submit(formData: FormData) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setMessage("尚未設定 Supabase 環境變數，請稍後再試。");
      return;
    }

    setPending(true);
    setMessage(undefined);
    const supabase = createClient(url, key);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const { error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : isSignup ? "請查看信箱完成驗證。" : "登入成功。");
    setPending(false);
  }

  return (
    <form action={submit} className="mt-8 space-y-4">
      <label className="block text-sm font-semibold">電子信箱<Input name="email" type="email" autoComplete="email" required className="mt-2" /></label>
      <label className="block text-sm font-semibold">密碼<Input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={6} required className="mt-2" /></label>
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      <Button className="w-full" type="submit" disabled={pending}>{pending ? "處理中…" : isSignup ? "建立帳號" : "登入"}</Button>
      <p className="text-center text-sm text-muted">
        {isSignup ? "已經有帳號？" : "第一次來？"} <Link className="font-semibold text-accent underline" href={isSignup ? "/login" : "/signup"}>{isSignup ? "登入" : "建立帳號"}</Link>
      </p>
    </form>
  );
}
