import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PageShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-lg px-5 py-8">
      {eyebrow && <p className="mb-2 text-sm font-semibold text-accent">{eyebrow}</p>}
      <h1 className="display text-4xl leading-tight">{title}</h1>
      {children}
    </main>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className="mt-12 border-t pt-8">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 max-w-sm leading-7 text-muted">{description}</p>
      {action && (
        <Link href={action.href} className="mt-6 inline-block">
          <Button>{action.label}</Button>
        </Link>
      )}
    </section>
  );
}
