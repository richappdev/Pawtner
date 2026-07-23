import Link from "next/link";

const items = [
  ["Overview", "/foster"],
  ["Pets", "/foster/pets"],
  ["Applications", "/foster/applications"],
  ["Messages", "/foster/messages"],
  ["Materials", "/foster/materials"],
  ["More", "/foster/more"],
] as const;

export function FosterNav() {
  return (
    <nav aria-label="中途導覽" className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-5 py-3 text-sm font-semibold whitespace-nowrap">
        <Link href="/" className="mr-3 font-display text-lg">Pawtner</Link>
        {items.map(([label, href]) => (
          <Link key={href} href={href} className="text-muted hover:text-accent">
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
