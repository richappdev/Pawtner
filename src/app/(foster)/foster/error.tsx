"use client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export default function FosterError({ reset }: { error: Error; reset: () => void }) { return <main className="mx-auto max-w-xl px-6 py-12"><Alert title="Foster workspace unavailable" tone="danger"><p>Retry without repeating any completed transition.</p><Button className="mt-3" onClick={reset}>Retry</Button></Alert></main>; }
