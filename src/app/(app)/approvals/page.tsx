import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, formatDateRange } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ApprovalTrail } from "@/components/leave/approval-trail";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/widgets";
import { DecisionDialog } from "./decision-dialog";

export const metadata = { title: "Approvals · Cellutech HRMS" };
export const dynamic = "force-dynamic";

const requestInclude = {
  user: { select: { name: true, designation: { select: { name: true } } } },
  leaveType: { select: { name: true } },
  steps: { orderBy: { level: "asc" as const }, include: { approver: { select: { name: true } } } },
} satisfies Prisma.LeaveRequestInclude;

type PendingRequest = Prisma.LeaveRequestGetPayload<{ include: typeof requestInclude }>;

function RequestCard({ r, override }: { r: PendingRequest; override: boolean }) {
  return (
    <li className="space-y-3 py-4 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {r.user.name}
            {r.user.designation && <span className="font-normal text-muted-foreground"> · {r.user.designation.name}</span>}
          </p>
          <p className="text-sm">
            {r.leaveType.name} · {r.totalDays} day(s) · {formatDateRange(r.startDate, r.endDate)}
          </p>
          <p className="text-xs text-muted-foreground">Requested {formatDate(r.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {r.requiresEscalation && <Badge variant="outline">Escalation</Badge>}
          {r.currentApprovalStep === 2 && <Badge variant="outline">Level 2</Badge>}
        </div>
      </div>

      <p className="text-sm text-foreground/80">{r.reason}</p>
      <ApprovalTrail steps={r.steps} />

      <div className="flex gap-2">
        <DecisionDialog requestId={r.id} decision="APPROVED" employee={r.user.name} commentRequired={override} />
        <DecisionDialog requestId={r.id} decision="REJECTED" employee={r.user.name} commentRequired />
      </div>
    </li>
  );
}

export default async function ApprovalsPage() {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD", "TEAM_LEAD");
  const canOverride = user.roleName === "SUPER_ADMIN" || user.roleName === "HR_MANAGER";

  // 1. Requests currently waiting on this person
  const steps = await prisma.leaveApprovalStep.findMany({
    where: { approverId: user.id, decision: "PENDING", leaveRequest: { status: "PENDING" } },
    orderBy: { createdAt: "asc" },
    include: { leaveRequest: { include: requestInclude } },
  });
  const queue = steps.filter((s) => s.level === s.leaveRequest.currentApprovalStep).map((s) => s.leaveRequest);

  // 2. HR / Super Admin: other pending requests in scope (override)
  const others = canOverride
    ? await prisma.leaveRequest.findMany({
        where: {
          status: "PENDING",
          id: { notIn: queue.map((q) => q.id) },
          userId: { not: user.id },
          ...(user.roleName === "HR_MANAGER" ? { user: { subsidiaryId: user.subsidiaryId } } : {}),
        },
        orderBy: { createdAt: "asc" },
        include: requestInclude,
      })
    : [];

  // 3. Decisions this person made
  const decided = await prisma.leaveApprovalStep.findMany({
    where: { approverId: user.id, decision: { not: "PENDING" } },
    orderBy: { decidedAt: "desc" },
    take: 10,
    include: {
      leaveRequest: {
        select: {
          startDate: true,
          endDate: true,
          user: { select: { name: true } },
          leaveType: { select: { name: true } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader title="Approvals" description="Leave requests waiting for your decision" />

      <Panel title={`Waiting for you (${queue.length})`}>
        {queue.length === 0 ? (
          <EmptyState text="No requests are waiting for you." />
        ) : (
          <ul className="divide-y">
            {queue.map((r) => (
              <RequestCard key={r.id} r={r} override={false} />
            ))}
          </ul>
        )}
      </Panel>

      {canOverride && (
        <Panel
          title={`Other pending requests (${others.length})`}
          description={
            user.roleName === "HR_MANAGER"
              ? "In your subsidiary. You can override a decision in exception cases — a comment is required."
              : "Across all subsidiaries. You can override a decision — a comment is required."
          }
          className="mt-4"
        >
          {others.length === 0 ? (
            <EmptyState text="No other pending requests." />
          ) : (
            <ul className="divide-y">
              {others.map((r) => (
                <RequestCard key={r.id} r={r} override />
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Panel title="Your recent decisions" className="mt-4">
        {decided.length === 0 ? (
          <EmptyState text="You haven't decided on any requests yet." />
        ) : (
          <ul className="divide-y">
            {decided.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{s.leaveRequest.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.leaveRequest.leaveType.name} · {formatDateRange(s.leaveRequest.startDate, s.leaveRequest.endDate)}
                    {s.decidedAt && ` · decided ${formatDate(s.decidedAt)}`}
                  </p>
                </div>
                <StatusBadge status={s.decision} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}