import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { navFor } from "@/lib/permissions";
import { SidebarBrand, SidebarNav } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";

// Every page inside (app) requires a signed-in user and gets the role-aware shell.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await prisma.notification.count({ where: { userId: user.id, isRead: false } });
  const items = navFor(user.roleName).map(({ href, label, icon }) => ({ href, label, icon }));

  return (
    <div className="flex min-h-screen bg-[#f6f7fb] dark:bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-card md:block">
        <SidebarBrand />
        <SidebarNav items={items} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} items={items} unread={unread} />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}