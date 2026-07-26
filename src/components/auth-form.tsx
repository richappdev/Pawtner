"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";
  const router = useRouter();
  const useFirebase = isFirebaseAuthEnabled();

  async function provisionFirebaseUser(idToken: string) {
    const response = await fetch("/api/auth/provision", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(body?.error?.message ?? "Unable to provision identity.");
    }
  }

  async function submitFirebase(formData: FormData) {
    const auth = getFirebaseAuth();
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const credential = isSignup
      ? await createUserWithEmailAndPassword(auth, email, password)
      : await signInWithEmailAndPassword(auth, email, password);

    if (isSignup && credential.user.displayName == null) {
      await updateProfile(credential.user, { displayName: email.split("@")[0] });
    }

    const idToken = await credential.user.getIdToken();
    await provisionFirebaseUser(idToken);
    document.cookie = `pawtner_firebase_id_token=${encodeURIComponent(idToken)}; path=/; SameSite=Lax`;
  }

  async function submitSupabase(formData: FormData) {
    const supabase = createClient();
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const { data, error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    if (!data.session) {
      setMessage("請前往信箱完成驗證。");
      return false;
    }
    return true;
  }

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);

    try {
      if (useFirebase) {
        await submitFirebase(formData);
      } else {
        const ready = await submitSupabase(formData);
        if (!ready) return;
      }

      router.replace("/explore");
      router.refresh();
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
      {useFirebase && (
        <p className="text-center text-xs text-muted">Firebase Auth bridge enabled</p>
      )}
    </form>
  );
}
