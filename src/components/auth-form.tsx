"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";
  const router = useRouter();

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);

    try {
      const supabase = createClient();
      const email = String(formData.get("email"));
      const password = String(formData.get("password"));
      const { data, error } = isSignup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        router.replace("/explore");
        router.refresh();
        return;
      }

      setMessage("請前往信箱完成驗證。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "無法初始化登入服務。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="mt-8 space-y-4">
      <label className="block text-sm font-semibold">
        電子信箱
        <Input name="email" type="email" autoComplete="email" required className="mt-2" />
      </label>
      <label className="block text-sm font-semibold">
        密碼
        <Input
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={6}
          required
          className="mt-2"
        />
      </label>
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "處理中…" : isSignup ? "建立帳號" : "登入"}
      </Button>
      <p className="text-center text-sm text-muted">
        {isSignup ? "已經有帳號？" : "還沒有帳號？"}{" "}
        <Link className="font-semibold text-accent underline" href={isSignup ? "/login" : "/signup"}>
          {isSignup ? "登入" : "建立帳號"}
        </Link>
      </p>
    </form>
  );
}
