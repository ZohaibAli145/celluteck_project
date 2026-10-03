import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { MobileNav, type SidebarItem } from "@/components/app-sidebar";
import { ROLE_LABELS } from "@/lib/permissions";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import type { CurrentUser } from "@/lib/auth";

export function Topbar({ user, items, unread }: { user: CurrentUser; items: SidebarItem[]; unread: number }) {
  const place = user.roleName === "SUPER_ADMIN" ? "Global · All subsidiaries" : user.subsidiary ? `${user.subsidiary.name} · ${user.subsidiary.country.name}` : "";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <MobileNav items={items} />
      <p className="hidden text-sm text-muted-foreground sm:block">{place}</p>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/notifications"
          aria-label={`Notifications (${unread} unread)`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3 border-l pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
            {initials(user.name)}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.roleName]}</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}