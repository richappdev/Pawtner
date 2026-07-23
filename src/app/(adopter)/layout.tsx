import { AdopterNav } from "@/components/nav/adopter-nav";

export default function AdopterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdopterNav />
    </>
  );
}
