// One server component per role dashboard. Each fetches its own live data.
import Link from "next/link";
import { CalendarClock, CalendarOff, CheckCircle2, Globe2, Percent, UserCheck, Users } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import {
  getAnnouncements, getBalanceSummary, getGlobalDashboard, getRecentRequests,
  getSubsidiaryDashboard, getTeamDashboard, getUpcomingHolidays,
} from "@/lib/dashboard";
import { CHART_COLORS, formatDate, formatDateRange } from "@/lib/format";
import { BarChartView, DonutView } from "@/components/charts";
import { StatusBadge } from "@/components/status-badge";
import {
  AnnouncementList, EmptyState, HolidayList, PageHeader, Panel, PendingLeaveTable, RecentRequests, StatCard,
} from "./widgets";

const firstName = (u: CurrentUser) => u.name.split(" ")[0];

const BALANCE_SERIES = [
  { key: "Used", color: CHART_COLORS.primary },
  { key: "Pending", color: CHART_COLORS.amber },
  { key: "Remaining", color: CHART_COLORS.green },
];

// ───────────── Super Admin ─────────────
export async function GlobalView({ user }: { user: CurrentUser }) {
  const [d, announcements] = await Promise.all([getGlobalDashboard(), getAnnouncements(user.subsidiaryId)]);

  return (
    <>
      <PageHeader title={`Welcome back, ${firstName(user)}`} description="Global overview across all subsidiaries" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total headcount" value={d.totalHeadcount} hint="Active employees worldwide" />
        <StatCard icon={Globe2} label="Subsidiaries" value={d.subsidiaries.length} hint={`${d.countryCount} countries`} />
        <StatCard icon={CalendarClock} label="Pending leave requests" value={d.pendingCount} hint="Across all subsidiaries" />
        <StatCard icon={Percent} label="Attendance rate" value={`${d.attendanceRate}%`} hint="Last 14 days, company-wide" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Subsidiary comparison" description="Headcount vs pending leave requests" className="lg:col-span-2">
          <BarChartView
            data={d.subsidiaries.map((s) => ({ name: s.name, Headcount: s.headcount, "Pending leave": s.pending }))}
            series={[
              { key: "Headcount", color: CHART_COLORS.primary },
              { key: "Pending leave", color: CHART_COLORS.amber },
            ]}
          />
        </Panel>
        <Panel title="Headcount by country">
          <DonutView data={d.headcountByCountry.map((c, i) => ({ ...c, color: CHART_COLORS.palette[i % CHART_COLORS.palette.length] }))} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Attendance rate by subsidiary" description="% present / late / remote, last 14 days">
          <BarChartView
            data={d.subsidiaries.map((s) => ({ name: s.name, "Attendance %": s.attendanceRate }))}
            series={[{ key: "Attendance %", color: CHART_COLORS.teal }]}
            yMax={100}
          />
        </Panel>
        <Panel title="Pending leave across subsidiaries" description="Most recent requests awaiting a decision" className="lg:col-span-2">
          <PendingLeaveTable rows={d.pendingList.map((p) => ({ ...p }))} showSubsidiary />
        </Panel>
      </div>

      <Panel title="Announcements" className="mt-4">
        <AnnouncementList items={announcements} />
      </Panel>
    </>
  );
}

// ───────────── Subsidiary HR Manager ─────────────
export async function SubsidiaryView({ user }: { user: CurrentUser }) {
  if (!user.subsidiaryId) return <EmptyState text="Your account is not linked to a subsidiary." />;
  const [d, holidays, announcements] = await Promise.all([
    getSubsidiaryDashboard(user.subsidiaryId),
    getUpcomingHolidays(user.subsidiaryId),
    getAnnouncements(user.subsidiaryId),
  ]);

  return (
    <>
      <PageHeader title={`Welcome back, ${firstName(user)}`} description={`${user.subsidiary?.name} overview`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Headcount" value={d.headcount} hint="Active employees" />
        <StatCard icon={CalendarOff} label="On leave today" value={d.onLeaveToday} hint="Approved leave covering today" />
        <StatCard icon={CalendarClock} label="Pending requests" value={d.pendingCount} hint="Awaiting approval" />
        <StatCard icon={Percent} label="Attendance rate" value={`${d.attendanceRate}%`} hint="Last 14 days" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Headcount by department" className="lg:col-span-2">
          <BarChartView data={d.headcountByDept} series={[{ key: "Headcount", color: CHART_COLORS.primary }]} />
        </Panel>
        <Panel title="Attendance breakdown" description="Last 14 days">
          <DonutView data={d.attendanceBreakdown} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Leave utilization" description="Days used vs still available, by leave type" className="lg:col-span-2">
          <BarChartView
            data={d.leaveUtilization}
            series={[
              { key: "Used", color: CHART_COLORS.primary },
              { key: "Available", color: "#c7d2fe" },
            ]}
            stacked
          />
        </Panel>
        <Panel title="Upcoming holidays">
          <HolidayList holidays={holidays} />
        </Panel>
      </div>

      <Panel title="Announcements" className="mt-4">
        <AnnouncementList items={announcements} />
      </Panel>
    </>
  );
}

// ───────────── Department Head / Team Lead ─────────────
export async function TeamView({ user }: { user: CurrentUser }) {
  const [d, balance, holidays] = await Promise.all([
    getTeamDashboard(user.id),
    getBalanceSummary(user.id),
    getUpcomingHolidays(user.subsidiaryId),
  ]);

  return (
    <>
      <PageHeader title={`Welcome back, ${firstName(user)}`} description="Your team at a glance" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Pending approvals" value={d.queue.length} hint="Waiting on you" />
        <StatCard icon={Users} label="Team size" value={d.teamSize} hint={`${d.directReports} direct report(s)`} />
        <StatCard
          icon={UserCheck}
          label="Working today"
          value={d.attendance ? `${d.attendance.present}/${d.attendance.total}` : "—"}
          hint={d.attendance ? `Latest attendance: ${formatDate(d.attendance.date)}` : "No attendance recorded"}
        />
        <StatCard icon={CalendarOff} label="Away (next 30 days)" value={d.away.length} hint="Approved or pending leave" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel
          title="Approvals queue"
          description="Requests currently waiting for your decision"
          className="lg:col-span-2"
        >
          <PendingLeaveTable rows={d.queue} />
          {d.queue.length > 0 && (
            <Link href="/approvals" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Review in approvals →
            </Link>
          )}
        </Panel>
        <Panel title="Team attendance" description={d.attendance ? formatDate(d.attendance.date) : undefined}>
          <DonutView data={d.attendance?.data ?? []} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Team leave calendar" description="Who is away in the next 30 days" className="lg:col-span-2">
          {d.away.length === 0 ? (
            <EmptyState text="Nobody on your team is away soon." />
          ) : (
            <ul className="divide-y">
              {d.away.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{a.employee}</p>
                    <p className="text-xs text-muted-foreground">{a.type} · {formatDateRange(a.start, a.end)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Upcoming holidays">
          <HolidayList holidays={holidays} />
        </Panel>
      </div>

      <Panel title="My leave balance" description="Your own balance this year (days)" className="mt-4">
        <BarChartView data={balance} series={BALANCE_SERIES} stacked height={240} />
      </Panel>
    </>
  );
}

// ───────────── Employee ─────────────
export async function EmployeeView({ user }: { user: CurrentUser }) {
  const [balance, recent, holidays, announcements] = await Promise.all([
    getBalanceSummary(user.id),
    getRecentRequests(user.id),
    getUpcomingHolidays(user.subsidiaryId),
    getAnnouncements(user.subsidiaryId),
  ]);
  const pending = recent.filter((r) => r.status === "PENDING").length;
  const remainingTotal = balance.reduce((n, b) => n + b.Remaining, 0);

  return (
    <>
      <PageHeader title={`Welcome back, ${firstName(user)}`} description="Your leave, requests and company updates" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarClock} label="Days remaining (all types)" value={remainingTotal} hint="After pending requests" />
        <StatCard icon={CheckCircle2} label="Pending requests" value={pending} hint="Awaiting a decision" />
        <StatCard icon={Users} label="Reports to" value={user.manager?.name ?? "—"} hint={user.designation?.name} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Leave balance" description="Used, pending and remaining days per type" className="lg:col-span-2">
          <BarChartView data={balance} series={BALANCE_SERIES} stacked />
        </Panel>
        <Panel title="Upcoming holidays">
          <HolidayList holidays={holidays} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="My recent requests">
          <RecentRequests items={recent} />
        </Panel>
        <Panel title="Announcements">
          <AnnouncementList items={announcements} />
        </Panel>
      </div>
    </>
  );
}