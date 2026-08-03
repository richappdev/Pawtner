"use client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export default function AdminError({ reset }: { error: Error; reset: () => void }) { return <main className="mx-auto max-w-xl px-6 py-12"><Alert title="Operations data unavailable" tone="danger"><p>No action was retried automatically.</p><Button className="mt-3" onClick={reset}>Retry</Button></Alert></main>; }
