import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function StatCard({
  label, value, hint, icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function Panel({
  title, description, children, className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

export function HolidayList({ holidays }: { holidays: { id: string; name: string; date: Date }[] }) {
  if (holidays.length === 0) return <EmptyState text="No upcoming holidays." />;
  return (
    <ul className="divide-y">
      {holidays.map((h) => (
        <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
          <span className="font-medium">{h.name}</span>
          <span className="text-muted-foreground">{formatDate(h.date)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnnouncementList({
  items,
}: {
  items: { id: string; title: string; body: string; scope: string; createdAt: Date; createdBy: { name: string }; subsidiary: { name: string } | null }[];
}) {
  if (items.length === 0) return <EmptyState text="No announcements." />;
  return (
    <ul className="space-y-4">
      {items.map((a) => (
        <li key={a.id}>
          <p className="text-sm font-medium">{a.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{a.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {a.scope === "GLOBAL" ? "Company-wide" : a.subsidiary?.name} · {a.createdBy.name} · {formatDate(a.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export interface LeaveRow {
  id: string;
  employee: string;
  subsidiary?: string;
  type: string;
  start: Date;
  end: Date;
  days: number;
}

export function PendingLeaveTable({ rows, showSubsidiary = false }: { rows: LeaveRow[]; showSubsidiary?: boolean }) {
  if (rows.length === 0) return <EmptyState text="Nothing pending — all caught up." />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            {showSubsidiary && <TableHead>Subsidiary</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="text-right">Days</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.employee}</TableCell>
              {showSubsidiary && <TableCell>{r.subsidiary}</TableCell>}
              <TableCell>{r.type}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDateRange(r.start, r.end)}</TableCell>
              <TableCell className="text-right">{r.days}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function RecentRequests({
  items,
}: {
  items: { id: string; type: string; start: Date; end: Date; days: number; status: string; waitingFor: string | null }[];
}) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        You haven&apos;t requested any leave yet.{" "}
        <Link href="/leave" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Apply now</Link>
      </div>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{r.type} · {r.days} day(s)</p>
            <p className="text-xs text-muted-foreground">
              {formatDateRange(r.start, r.end)}
              {r.waitingFor && <span className={cn("ml-1")}>· waiting for {r.waitingFor}</span>}
            </p>
          </div>
          <StatusBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}