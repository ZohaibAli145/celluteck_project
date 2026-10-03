import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getRemainingBalance, iso, parseWeekend } from "@/lib/leave";
import { cancelLeaveAction } from "@/app/actions/leave";
import { formatDateRange, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ApprovalTrail } from "@/components/leave/approval-trail";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/widgets";
import { LeaveForm } from "./leave-form";

export const metadata = { title: "My Leave · Cellutech HRMS" };
export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const user = await requireUser();
  if (!user.subsidiaryId || !user.subsidiary) {
    return <EmptyState text="Your account is not linked to a subsidiary, so no leave policy applies." />;
  }
  const year = new Date().getUTCFullYear();

  const [types, holidays, requests] = await Promise.all([
    prisma.leaveType.findMany({ where: { subsidiaryId: user.subsidiaryId }, orderBy: { name: "asc" } }),
    prisma.holiday.findMany({ where: { subsidiaryId: user.subsidiaryId }, select: { date: true } }),
    prisma.leaveRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        leaveType: { select: { name: true } },
        steps: { orderBy: { level: "asc" }, include: { approver: { select: { name: true } } } },
      },
    }),
  ]);
  const balances = await Promise.all(types.map((t) => getRemainingBalance(user.id, t.id, year)));

  const options = types.map((t, i) => ({
    id: t.id,
    name: t.name,
    remaining: balances[i]?.remaining ?? 0,
    requiresEscalation: t.requiresEscalation,
    threshold: t.escalationThresholdDays,
  }));

  return (
    <>
      <PageHeader title="My Leave" description="Apply for leave, track approvals and see your balances" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {types.map((t, i) => {
          const b = balances[i];
          const allotted = b?.allotted ?? 0;
          const usedPct = allotted === 0 ? 0 : Math.min(100, Math.round((((b?.used ?? 0) + (b?.pending ?? 0)) / allotted) * 100));
          return (
            <div key={t.id} className="rounded-xl border bg-card p-4">
              <p className="truncate text-sm text-muted-foreground">{t.name}</p>
              <p className="mt-1 text-2xl font-semibold">
                {b?.remaining ?? 0}
                <span className="text-sm font-normal text-muted-foreground"> / {allotted} days</span>
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {b?.used ?? 0} used · {b?.pending ?? 0} pending
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Apply for leave" description="Routed to your manager automatically" className="h-fit">
          <LeaveForm
            types={options}
            weekendDays={parseWeekend(user.subsidiary.weekendDays)}
            holidays={holidays.map((h) => iso(h.date))}
          />
        </Panel>

        <Panel title="My requests" description="Newest first, with the full approval trail" className="lg:col-span-2">
          {requests.length === 0 ? (
            <EmptyState text="You haven't requested any leave yet." />
          ) : (
            <ul className="divide-y">
              {requests.map((r) => (
                <li key={r.id} className="space-y-3 py-4 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {r.leaveType.name} · {r.totalDays} day(s)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateRange(r.startDate, r.endDate)} · requested {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-foreground/80">{r.reason}</p>
                  <ApprovalTrail steps={r.steps} />
                  {r.status === "PENDING" && (
                    <form action={cancelLeaveAction.bind(null, r.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        Cancel request
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}