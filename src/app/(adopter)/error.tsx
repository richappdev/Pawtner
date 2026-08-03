"use client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export default function AdopterError({ reset }: { error: Error; reset: () => void }) { return <main className="mx-auto max-w-xl px-6 py-12"><Alert title="This page could not be loaded" tone="danger"><p>Your data is safe. Retry the request or return later.</p><Button className="mt-3" onClick={reset}>Retry</Button></Alert></main>; }
