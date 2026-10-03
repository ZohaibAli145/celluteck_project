// Leave business rules. Pure-ish helpers; the actions in app/actions/leave.ts call these.
import type { LeaveType } from "@prisma/client";
import { prisma } from "./prisma";
import { getManagerChain } from "./hierarchy";

export const iso = (d: Date) => d.toISOString().slice(0, 10);

/** "2026-10-05" -> Date at UTC midnight, or null when invalid. */
export function toUtcDate(value: string): Date | null {
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || iso(d) !== value ? null : d;
}

export function parseWeekend(csv: string): number[] {
  return csv.split(",").map((s) => s.trim()).filter(Boolean).map(Number);
}

/** Working days in [start, end], excluding the subsidiary's weekends and public holidays. */
export async function countLeaveDays(subsidiaryId: string, start: Date, end: Date): Promise<number> {
  const sub = await prisma.subsidiary.findUnique({
    where: { id: subsidiaryId },
    select: { weekendDays: true },
  });
  if (!sub) throw new Error("Subsidiary not found");

  const weekend = parseWeekend(sub.weekendDays);
  const holidays = await prisma.holiday.findMany({
    where: { subsidiaryId, date: { gte: start, lte: end } },
    select: { date: true },
  });
  const holidaySet = new Set(holidays.map((h) => iso(h.date)));

  let days = 0;
  const d = new Date(start);
  while (d <= end) {
    if (!weekend.includes(d.getUTCDay()) && !holidaySet.has(iso(d))) days++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

/** Escalate when the type is flagged, or the leave is longer than the threshold. */
export function needsEscalation(
  totalDays: number,
  type: Pick<LeaveType, "requiresEscalation" | "escalationThresholdDays">,
): boolean {
  return type.requiresEscalation || totalDays > type.escalationThresholdDays;
}

export interface ChainStep {
  approverId: string;
  level: number;
}

/**
 * Level 1 = direct (active) manager.
 * Level 2 (only when escalating) = nearest Department Head above level 1.
 * No manager at all (top of the tree) -> empty chain = auto-approved.
 * If nobody above is a Department Head, level 1 is final.
 */
export async function buildApprovalChain(userId: string, escalate: boolean): Promise<ChainStep[]> {
  const chain = await getManagerChain(userId);
  if (chain.length === 0) return [];

  const steps: ChainStep[] = [{ approverId: chain[0].id, level: 1 }];
  if (escalate) {
    const head = chain.slice(1).find((m) => m.roleName === "DEPT_HEAD");
    if (head) steps.push({ approverId: head.id, level: 2 });
  }
  return steps;
}

/** Balance after reserving days of still-pending requests, so users can't over-book. */
export async function getRemainingBalance(userId: string, leaveTypeId: string, year: number) {
  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
  });
  if (!balance) return null;

  const pending = await prisma.leaveRequest.aggregate({
    _sum: { totalDays: true },
    where: {
      userId,
      leaveTypeId,
      status: "PENDING",
      startDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
    },
  });
  const pendingDays = pending._sum.totalDays ?? 0;
  return {
    allotted: balance.allotted,
    used: balance.used,
    pending: pendingDays,
    remaining: balance.allotted - balance.used - pendingDays,
  };
}