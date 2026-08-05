"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isFirebaseAuthEnabled, isFirebaseAuthForcedForEmail } from "@/lib/auth/firebase-flags";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { trackEvent } from "@/lib/firebase/observability";
import {
  clearFirebaseIdTokenCookieClient,
  getFirebaseIdToken,
  signOutFirebase,
  writeFirebaseIdTokenCookie,
} from "@/lib/firebase/session";
import { logger } from "@/lib/logging";
import { createPasswordAuthClient } from "@/lib/supabase/client";

type ProvisionResponse = {
  data?: { refreshIdToken?: boolean };
  error?: { message?: string };
};

export function AuthForm({
  mode,
  inviteToken,
}: {
  mode: "login" | "signup";
  inviteToken?: string;
}) {
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";
  const router = useRouter();
  const t = useTranslations("Auth");

  function shouldUseFirebase(email: string) {
    if (!isFirebaseAuthEnabled()) return false;
    // When a cohort is configured, only those emails use Firebase; otherwise all users do.
    const cohort = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMAIL_COHORT ?? process.env.FIREBASE_AUTH_EMAIL_COHORT;
    if (cohort && cohort.trim()) {
      return isFirebaseAuthForcedForEmail(email);
    }
    return true;
  }

  async function provisionFirebaseUser(idToken: string) {
    const response = await fetch("/api/auth/provision", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inviteToken ? { inviteToken } : {}),
    });
    const body = (await response.json().catch(() => null)) as ProvisionResponse | null;
    if (!response.ok) {
      throw new Error(body?.error?.message ?? t("provisionFailed"));
    }
    return body?.data;
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

    let idToken = await credential.user.getIdToken();
    const provisioned = await provisionFirebaseUser(idToken);
    if (provisioned?.refreshIdToken) {
      const refreshed = await getFirebaseIdToken(true);
      if (!refreshed) {
        throw new Error(t("refreshFailed"));
      }
      idToken = refreshed;
    }
    writeFirebaseIdTokenCookie(idToken);
  }

  async function submitSupabase(formData: FormData) {
    // Clear any leftover Firebase session so we never call signInWithPassword
    // on an accessToken-bound Supabase client.
    clearFirebaseIdTokenCookieClient();
    try {
      await signOutFirebase();
    } catch {
      // Firebase may be unconfigured locally; password auth can still proceed.
    }

    const supabase = createPasswordAuthClient();
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const { data, error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    if (!data.session) {
      setMessage(t("emailVerification"));
      return false;
    }
    return true;
  }

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);

    try {
      const email = String(formData.get("email"));
      const provider = shouldUseFirebase(email) ? "firebase" : "supabase";
      if (provider === "firebase") {
        await submitFirebase(formData);
      } else {
        const ready = await submitSupabase(formData);
        if (!ready) return;
      }

      logger.info("auth.login.success", { provider, mode });
      void trackEvent(isSignup ? "sign_up" : "login", { method: provider });
      router.replace("/explore");
      router.refresh();
    } catch (error) {
      logger.warn("auth.login.failure", {
        mode,
        message: error instanceof Error ? error.message : "unknown",
      });
      setMessage(error instanceof Error ? error.message : t("serviceUnavailable"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="mt-8 space-y-4">
      <label className="block text-sm font-semibold">
        {t("email")}
        <Input name="email" type="email" autoComplete="email" required className="mt-2" />
      </label>
      <label className="block text-sm font-semibold">
        {t("password")}
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
        {pending ? t("processing") : isSignup ? t("createAccount") : t("loginAction")}
      </Button>
      <p className="text-center text-sm text-muted">
        {isSignup ? t("alreadyAccount") : t("needAccount")}{" "}
        <Link className="font-semibold text-accent underline" href={isSignup ? "/login" : "/signup"}>
          {isSignup ? t("loginAction") : t("createAccount")}
        </Link>
      </p>
      {isFirebaseAuthEnabled() && (
        <p className="text-center text-xs text-muted">{t("firebaseBridge")}</p>
      )}
    </form>
  );
}
