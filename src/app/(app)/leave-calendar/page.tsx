import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseWeekend } from "@/lib/leave";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/widgets";
import { cn } from "@/lib/utils";

export const metadata = { title: "Leave Calendar · Cellutech HRMS" };
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

interface Cell {
  status: string;
  type: string;
}

export default async function LeaveCalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUser();
  const { m } = await searchParams;

  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  const match = /^(\d{4})-(\d{2})$/.exec(m ?? "");
  if (match && +match[2] >= 1 && +match[2] <= 12) {
    year = +match[1];
    month = +match[2] - 1;
  }
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));
  const daysInMonth = monthEnd.getUTCDate();
  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  const title = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart);

  // Scope: admin = everyone, HR = own subsidiary, everyone else = own department (team coverage view)
  const userWhere: Prisma.UserWhereInput = { status: { not: "TERMINATED" } };
  let scopeText = "All subsidiaries";
  if (user.roleName === "HR_MANAGER") {
    userWhere.subsidiaryId = user.subsidiaryId;
    scopeText = user.subsidiary?.name ?? "Your subsidiary";
  } else if (user.roleName !== "SUPER_ADMIN") {
    if (user.departmentId) userWhere.departmentId = user.departmentId;
    else userWhere.id = user.id;
    scopeText = `${user.department?.name ?? "Your"} department`;
  }

  const weekend = parseWeekend(user.subsidiary?.weekendDays ?? "0,6");
  const [requests, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
        user: userWhere,
      },
      orderBy: [{ user: { name: "asc" } }, { startDate: "asc" }],
      select: {
        status: true,
        startDate: true,
        endDate: true,
        leaveType: { select: { name: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    user.subsidiaryId
      ? prisma.holiday.findMany({
          where: { subsidiaryId: user.subsidiaryId, date: { gte: monthStart, lte: monthEnd } },
          select: { date: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  // person -> day number -> cell
  const people = new Map<string, { name: string; days: Map<number, Cell> }>();
  for (const r of requests) {
    const entry = people.get(r.user.id) ?? { name: r.user.name, days: new Map<number, Cell>() };
    const from = Math.max(r.startDate.getTime(), monthStart.getTime());
    const to = Math.min(r.endDate.getTime(), monthEnd.getTime());
    for (let t = from; t <= to; t += DAY_MS) {
      const day = new Date(t).getUTCDate();
      const existing = entry.days.get(day);
      if (!existing || (existing.status === "PENDING" && r.status === "APPROVED")) {
        entry.days.set(day, { status: r.status, type: r.leaveType.name });
      }
    }
    people.set(r.user.id, entry);
  }

  const holidayByDay = new Map(holidays.map((h) => [h.date.getUTCDate(), h.name]));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const isWeekend = (d: number) => weekend.includes(new Date(Date.UTC(year, month, d)).getUTCDay());
  const awayCount = (d: number) => [...people.values()].filter((p) => p.days.has(d)).length;

  const navLink = "rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-accent";

  return (
    <>
      <PageHeader title="Leave Calendar" description={`${scopeText} — who is away, to plan coverage`} />

      <div className="mb-4 flex items-center gap-2">
        <Link href={`/leave-calendar?m=${monthKey(prev.getUTCFullYear(), prev.getUTCMonth())}`} className={navLink} aria-label="Previous month">
          ← Prev
        </Link>
        <span className="min-w-36 text-center text-sm font-medium">{title}</span>
        <Link href={`/leave-calendar?m=${monthKey(next.getUTCFullYear(), next.getUTCMonth())}`} className={navLink} aria-label="Next month">
          Next →
        </Link>
        <Link href="/leave-calendar" className="ml-2 text-sm text-indigo-600 hover:underline dark:text-indigo-400">Today</Link>
      </div>

      <Panel title={`${people.size} ${people.size === 1 ? "person" : "people"} away this month`}>
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500" /> Approved</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-300 dark:bg-amber-500" /> Pending</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-100 ring-1 ring-rose-200 dark:bg-rose-500/25 dark:ring-rose-500/40" /> Public holiday</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-muted ring-1 ring-border" /> Weekend</span>
        </div>

        {people.size === 0 ? (
          <EmptyState text="Nobody is on leave in this month." />
        ) : (
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-40 bg-card px-2 py-1 text-left font-medium">Employee</th>
                  {days.map((d) => (
                    <th key={d} className={cn("w-7 min-w-7 px-0.5 py-1 text-center font-normal", isWeekend(d) && "text-muted-foreground/60")}>
                      <div>{d}</div>
                      <div className="text-[10px]">{WEEKDAY[new Date(Date.UTC(year, month, d)).getUTCDay()]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...people.entries()].map(([id, p]) => (
                  <tr key={id}>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-2 py-1 font-medium">{p.name}</td>
                    {days.map((d) => {
                      const cell = p.days.get(d);
                      const holiday = holidayByDay.get(d);
                      return (
                        <td
                          key={d}
                          title={cell ? `${p.name}: ${cell.type} (${cell.status.toLowerCase()})` : holiday}
                          className={cn(
                            "h-7 w-7 border border-card",
                            cell
                              ? cell.status === "APPROVED" ? "bg-emerald-500" : "bg-amber-300 dark:bg-amber-500"
                              : holiday ? "bg-rose-100 dark:bg-rose-500/25" : isWeekend(d) ? "bg-muted" : "bg-muted/40",
                          )}
                        />
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 z-10 bg-card px-2 pt-2 text-[11px] font-medium text-muted-foreground">Away per day</td>
                  {days.map((d) => {
                    const n = awayCount(d);
                    return (
                      <td key={d} className={cn("pt-2 text-center text-[11px]", n >= 2 ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                        {n || ""}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {holidays.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Holidays this month: {holidays.map((h) => `${h.name} (${h.date.getUTCDate()})`).join(", ")}
          </p>
        )}
      </Panel>
    </>
  );
}