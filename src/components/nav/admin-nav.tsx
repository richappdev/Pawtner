import Link from "next/link";

const items = ["Dashboard", "Users", "Fosters", "Pets", "Applications", "Orders", "Reports", "AI", "Settings"];

export function AdminNav() {
  return (
    <aside className="border-b bg-white md:min-h-screen md:w-52 md:border-r md:border-b-0">
      <div className="flex gap-4 overflow-x-auto px-5 py-4 md:flex-col md:gap-1">
        <Link href="/" className="mr-4 font-display text-xl md:mb-5">Pawtner</Link>
        {items.map((label) => {
          const href = label === "Dashboard" ? "/admin" : `/admin/${label.toLowerCase()}`;
          return (
            <Link key={label} href={href} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-[#e4f0ed] hover:text-accent">
              {label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
