import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname: string; query?: Record<string, string> };
  children?: ReactNode;
};

export function Link({ href, children, ...props }: LinkProps) {
  const value = typeof href === "string" ? href : href.pathname;
  return <a href={value} {...props}>{children}</a>;
}

export function usePathname() { return "/"; }
export function useRouter() {
  return { push() {}, replace() {}, refresh() {}, back() {} };
}
