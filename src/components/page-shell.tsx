import { clsx } from "clsx";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ShellWidth = "sm" | "md" | "lg" | "xl";
type ShellRole = "public" | "adopter" | "foster" | "admin";

const widths: Record<ShellWidth, string> = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
  headerAction,
  breadcrumbs,
  width = "md",
  role = "adopter",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  headerAction?: React.ReactNode;
  breadcrumbs?: Array<{ href: string; label: string }>;
  width?: ShellWidth;
  role?: ShellRole;
}) {
  return (
    <main
      className={clsx(
        "mx-auto w-full px-5 py-8 sm:px-7 sm:py-12",
        widths[width],
        role === "adopter" && "pb-28 md:pb-12",
      )}
    >
      {breadcrumbs?.length ? (
        <nav aria-label="麵包屑" className="mb-6 flex flex-wrap gap-2 text-sm text-muted">
          {breadcrumbs.map((item, index) => (
            <span key={item.href} className="flex items-center gap-2">
              {index ? <span aria-hidden="true">/</span> : null}
              <Link href={item.href} className="font-semibold hover:text-accent">
                {item.label}
              </Link>
            </span>
          ))}
        </nav>
      ) : null}
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-3xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="display mt-2 text-4xl leading-tight sm:text-5xl">{title}</h1>
          {description ? <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p> : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </header>
      {children}
    </main>
  );
}

export function EmptyState({
  title,
  description,
  action,
  eyebrow = "NEXT STEP",
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
  eyebrow?: string;
}) {
  return (
    <Card tone="mint" className="mt-10 overflow-hidden p-0">
      <div className="grid sm:grid-cols-[1fr_13rem]">
        <div className="p-6 sm:p-8">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="display mt-2 text-2xl">{title}</h2>
          <p className="mt-3 max-w-lg leading-7 text-muted">{description}</p>
          {action ? (
            <ButtonLink href={action.href} className="mt-6">
              {action.label}
            </ButtonLink>
          ) : null}
        </div>
        <div className="relative min-h-36 overflow-hidden bg-sage/70" aria-hidden="true">
          <div className="absolute -bottom-10 left-8 h-28 w-28 rounded-full bg-apricot/80" />
          <div className="absolute right-8 top-7 h-20 w-20 rotate-12 rounded-[30%] bg-clay/80" />
          <div className="absolute bottom-8 right-16 h-14 w-28 rounded-full border-2 border-accent/30" />
        </div>
      </div>
    </Card>
  );
}
