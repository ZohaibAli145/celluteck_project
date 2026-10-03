"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2, CalendarDays, CalendarPlus, CheckCircle2, LayoutDashboard, Menu, Network, Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, CalendarPlus, CheckCircle2, CalendarDays, Users, Network, Building2,
};

export interface SidebarItem {
  href: string;
  label: string;
  icon: string;
}

export function SidebarBrand() {
  return (
    <div className="flex h-16 items-center gap-2 border-b px-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">C</div>
      <span className="font-semibold tracking-tight">Cellutech HRMS</span>
    </div>
  );
}

export function SidebarNav({ items, onNavigate }: { items: SidebarItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Main">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ items }: { items: SidebarItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Opened with state (not a trigger component) so it works with any shadcn flavour */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBrand />
          <SidebarNav items={items} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}