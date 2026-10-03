import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { markAllReadAction } from "@/app/actions/notifications";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/widgets";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications · Cellutech HRMS" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <>
      <PageHeader title="Notifications" description="Leave updates and approvals waiting for you" />

      <Panel title={`${unread} unread`}>
        {unread > 0 && (
          <form action={markAllReadAction} className="mb-3">
            <Button type="submit" variant="outline" size="sm">Mark all as read</Button>
          </form>
        )}

        {items.length === 0 ? (
          <EmptyState text="You're all caught up — no notifications yet." />
        ) : (
          <ul className="divide-y">
            {items.map((n) => {
              const body = (
                <div className="flex items-start gap-3 py-3">
                  <Bell className={cn("mt-0.5 h-4 w-4 shrink-0", n.isRead ? "text-muted-foreground/40" : "text-indigo-600 dark:text-indigo-400")} />
                  <div className="min-w-0">
                    <p className={cn("text-sm", !n.isRead && "font-medium")}>{n.message}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400" aria-label="Unread" />}
                </div>
              );
              return (
                <li key={n.id}>
                  {n.link ? <Link href={n.link} className="block hover:bg-accent">{body}</Link> : body}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}