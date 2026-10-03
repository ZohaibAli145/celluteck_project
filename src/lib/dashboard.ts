// All dashboard queries. Everything here reads from the database — no hard-coded numbers.
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getAllReportIds } from "./hierarchy";
import { ATTENDANCE_COLORS, ATTENDANCE_LABELS, pct, shortLeaveName, shortSubName } from "./format";

const PRESENT_STATUSES = ["PRESENT", "LATE", "WFH"];

export function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

// ───────────── shared widgets ─────────────

export async function getUpcomingHolidays(subsidiaryId: string | null, take = 5) {
  if (!subsidiaryId) return [];
  return prisma.holiday.findMany({
    where: { subsidiaryId, date: { gte: startOfTodayUtc() } },
    orderBy: { date: "asc" },
    take,
  });
}

export async function getAnnouncements(subsidiaryId: string | null, take = 3) {
  const OR: Prisma.AnnouncementWhereInput[] = [{ scope: "GLOBAL" }];
  if (subsidiaryId) OR.push({ scope: "SUBSIDIARY", subsidiaryId });
  return prisma.announcement.findMany({
    where: { OR },
    orderBy: { createdAt: "desc" },
    take,
    include: { createdBy: { select: { name: true } }, subsidiary: { select: { name: true } } },
  });
}

/** Per leave type: allotted / used / pending-reserved / remaining for the current year. */
export async function getBalanceSummary(userId: string) {
  const year = new Date().getUTCFullYear();
  const [balances, pending] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { userId, year },
      include: { leaveType: { select: { name: true } } },
      orderBy: { leaveType: { name: "asc" } },
    }),
    prisma.leaveRequest.groupBy({
      by: ["leaveTypeId"],
      where: { userId, status: "PENDING" },
      _sum: { totalDays: true },
    }),
  ]);
  const pendingByType = new Map(pending.map((p) => [p.leaveTypeId, p._sum.totalDays ?? 0]));

  return balances.map((b) => {
    const pend = pendingByType.get(b.leaveTypeId) ?? 0;
    return {
      name: shortLeaveName(b.leaveType.name),
      Used: b.used,
      Pending: pend,
      Remaining: Math.max(0, b.allotted - b.used - pend),
    };
  });
}

// ───────────── Super Admin: global overview ─────────────

export async function getGlobalDashboard() {
  const today = startOfTodayUtc();
  const from = addDays(today, -14);

  const [subs, pending, attendance] = await Promise.all([
    prisma.subsidiary.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        country: true,
        _count: { select: { users: { where: { status: { not: "TERMINATED" } } } } },
      },
    }),
    prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        leaveType: { select: { name: true } },
        user: { select: { name: true, subsidiaryId: true, subsidiary: { select: { name: true } } } },
      },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: from, lte: today } },
      select: { status: true, user: { select: { subsidiaryId: true } } },
    }),
  ]);

  const att = new Map<string, { present: number; total: number }>();
  let presentAll = 0;
  for (const a of attendance) {
    const key = a.user.subsidiaryId;
    if (!key) continue;
    const e = att.get(key) ?? { present: 0, total: 0 };
    e.total++;
    if (PRESENT_STATUSES.includes(a.status)) {
      e.present++;
      presentAll++;
    }
    att.set(key, e);
  }

  const rows = subs.map((s) => ({
    id: s.id,
    name: shortSubName(s.name),
    country: s.country.name,
    headcount: s._count.users,
    pending: pending.filter((p) => p.user.subsidiaryId === s.id).length,
    attendanceRate: pct(att.get(s.id)?.present ?? 0, att.get(s.id)?.total ?? 0),
  }));

  const byCountry = new Map<string, number>();
  rows.forEach((r) => byCountry.set(r.country, (byCountry.get(r.country) ?? 0) + r.headcount));

  return {
    totalHeadcount: rows.reduce((n, r) => n + r.headcount, 0),
    subsidiaries: rows,
    countryCount: byCountry.size,
    headcountByCountry: [...byCountry].map(([name, value]) => ({ name, value })),
    pendingCount: pending.length,
    pendingList: pending.slice(0, 6).map((p) => ({
      id: p.id,
      employee: p.user.name,
      subsidiary: p.user.subsidiary ? shortSubName(p.user.subsidiary.name) : "—",
      type: p.leaveType.name,
      start: p.startDate,
      end: p.endDate,
      days: p.totalDays,
    })),
    attendanceRate: pct(presentAll, attendance.length),
  };
}

// ───────────── Subsidiary HR Manager ─────────────

export async function getSubsidiaryDashboard(subsidiaryId: string) {
  const today = startOfTodayUtc();
  const from = addDays(today, -14);
  const year = today.getUTCFullYear();
  const activeUsers = { subsidiaryId, status: { not: "TERMINATED" } } satisfies Prisma.UserWhereInput;

  const [headcount, byDept, departments, balances, attGroups, pendingCount, onLeaveToday] = await Promise.all([
    prisma.user.count({ where: activeUsers }),
    prisma.user.groupBy({ by: ["departmentId"], where: activeUsers, _count: { _all: true } }),
    prisma.department.findMany({ where: { subsidiaryId }, select: { id: true, name: true } }),
    prisma.leaveBalance.findMany({
      where: { year, user: activeUsers },
      select: { allotted: true, used: true, leaveType: { select: { name: true } } },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { date: { gte: from, lte: today }, user: activeUsers },
      _count: { _all: true },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING", user: { subsidiaryId } } }),
    prisma.leaveRequest.count({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today }, user: { subsidiaryId } },
    }),
  ]);

  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const headcountByDept = byDept
    .map((g) => ({ name: g.departmentId ? (deptName.get(g.departmentId) ?? "Other") : "Unassigned", Headcount: g._count._all }))
    .sort((a, b) => b.Headcount - a.Headcount);

  const util = new Map<string, { allotted: number; used: number }>();
  for (const b of balances) {
    const e = util.get(b.leaveType.name) ?? { allotted: 0, used: 0 };
    e.allotted += b.allotted;
    e.used += b.used;
    util.set(b.leaveType.name, e);
  }
  const leaveUtilization = [...util].map(([name, v]) => ({
    name: shortLeaveName(name),
    Used: v.used,
    Available: Math.max(0, v.allotted - v.used),
  }));

  const attTotal = attGroups.reduce((n, g) => n + g._count._all, 0);
  const attPresent = attGroups.filter((g) => PRESENT_STATUSES.includes(g.status)).reduce((n, g) => n + g._count._all, 0);

  return {
    headcount,
    headcountByDept,
    leaveUtilization,
    attendanceRate: pct(attPresent, attTotal),
    attendanceBreakdown: attGroups.map((g) => ({
      name: ATTENDANCE_LABELS[g.status] ?? g.status,
      value: g._count._all,
      color: ATTENDANCE_COLORS[g.status] ?? "#94a3b8",
    })),
    pendingCount,
    onLeaveToday,
  };
}

// ───────────── Department Head / Team Lead ─────────────

export async function getTeamDashboard(userId: string) {
  const today = startOfTodayUtc();
  const ids = await getAllReportIds(userId); // direct + indirect reports

  const [steps, directReports, latest, away] = await Promise.all([
    prisma.leaveApprovalStep.findMany({
      where: { approverId: userId, decision: "PENDING", leaveRequest: { status: "PENDING" } },
      orderBy: { createdAt: "asc" },
      include: {
        leaveRequest: {
          include: { user: { select: { name: true } }, leaveType: { select: { name: true } } },
        },
      },
    }),
    prisma.user.count({ where: { managerId: userId, status: { not: "TERMINATED" } } }),
    prisma.attendance.findFirst({
      where: { userId: { in: ids }, date: { lte: today } },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId: { in: ids },
        status: { in: ["APPROVED", "PENDING"] },
        endDate: { gte: today },
        startDate: { lte: addDays(today, 30) },
      },
      orderBy: { startDate: "asc" },
      take: 8,
      include: { user: { select: { name: true } }, leaveType: { select: { name: true } } },
    }),
  ]);

  // Only steps that are *currently* waiting on this person
  const queue = steps
    .filter((s) => s.level === s.leaveRequest.currentApprovalStep)
    .map((s) => ({
      id: s.leaveRequest.id,
      employee: s.leaveRequest.user.name,
      type: s.leaveRequest.leaveType.name,
      start: s.leaveRequest.startDate,
      end: s.leaveRequest.endDate,
      days: s.leaveRequest.totalDays,
    }));

  let attendance: { date: Date; data: { name: string; value: number; color: string }[]; present: number; total: number } | null = null;
  if (latest) {
    const g = await prisma.attendance.groupBy({
      by: ["status"],
      where: { userId: { in: ids }, date: latest.date },
      _count: { _all: true },
    });
    attendance = {
      date: latest.date,
      data: g.map((x) => ({
        name: ATTENDANCE_LABELS[x.status] ?? x.status,
        value: x._count._all,
        color: ATTENDANCE_COLORS[x.status] ?? "#94a3b8",
      })),
      present: g.filter((x) => PRESENT_STATUSES.includes(x.status)).reduce((n, x) => n + x._count._all, 0),
      total: g.reduce((n, x) => n + x._count._all, 0),
    };
  }

  return {
    teamSize: ids.length,
    directReports,
    queue,
    attendance,
    away: away.map((a) => ({
      id: a.id,
      employee: a.user.name,
      type: a.leaveType.name,
      start: a.startDate,
      end: a.endDate,
      status: a.status,
    })),
  };
}

// ───────────── Employee ─────────────

export async function getRecentRequests(userId: string, take = 5) {
  const rows = await prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      leaveType: { select: { name: true } },
      steps: { orderBy: { level: "asc" }, include: { approver: { select: { name: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.leaveType.name,
    start: r.startDate,
    end: r.endDate,
    days: r.totalDays,
    status: r.status,
    waitingFor:
      r.status === "PENDING"
        ? (r.steps.find((s) => s.level === r.currentApprovalStep)?.approver.name ?? null)
        : null,
  }));
}