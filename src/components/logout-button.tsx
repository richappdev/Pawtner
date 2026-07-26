"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { isFirebaseAuthEnabled } from "@/lib/auth/firebase-flags";
import { signOutFirebase } from "@/lib/firebase/session";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      if (isFirebaseAuthEnabled()) {
        try {
          await signOutFirebase();
        } catch {
          // Continue with server logout even if client Firebase sign-out fails.
        }
      }
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" disabled={pending} onClick={logout}>
      {pending ? "登出中…" : "登出"}
    </Button>
  );
}
