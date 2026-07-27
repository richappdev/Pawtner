import { AdopterNav } from "@/components/nav/adopter-nav";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSessionActor } from "@/lib/auth/session-actor";

export default async function AdopterLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionActor();
  const showAdminPetsShortcut = session ? canAccessAdmin(session.actor) : false;

  return (
    <>
      {children}
      <AdopterNav showAdminPetsShortcut={showAdminPetsShortcut} />
    </>
  );
}
