"use client";

import { createBrowserClient } from "@supabase/ssr";

function requiredPublicEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createClient() {
  return createBrowserClient(
    requiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
