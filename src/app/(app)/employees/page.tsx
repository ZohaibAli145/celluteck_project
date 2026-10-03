import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getAllReportIds } from "@/lib/hierarchy";
import { ROLE_LABELS, type RoleName } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/widgets";
import { cn } from "@/lib/utils";

export const metadata = { title: "Employees · Cellutech HRMS" };
export const dynamic = "force-dynamic";

const STATUSES = ["ACTIVE", "ON_LEAVE", "TERMINATED"];
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  ON_LEAVE: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  TERMINATED: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs dark:bg-input/30 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sub?: string; dept?: string; status?: string }>;
}) {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD", "TEAM_LEAD");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const isAdmin = user.roleName === "SUPER_ADMIN";

  // Who may see whom (enforced here on the server)
  const where: Prisma.UserWhereInput = {};
  if (user.roleName === "HR_MANAGER") {
    where.subsidiaryId = user.subsidiaryId;
    where.role = { name: { not: "SUPER_ADMIN" } };
  } else if (user.roleName === "DEPT_HEAD" || user.roleName === "TEAM_LEAD") {
    where.id = { in: await getAllReportIds(user.id) }; // direct + indirect reports
  } else if (sp.sub) {
    where.subsidiaryId = sp.sub;
  }

  if (sp.dept) where.department = { name: sp.dept };
  if (sp.status && STATUSES.includes(sp.status)) where.status = sp.status;
  if (q) {
    where.OR = [{ name: { contains: q } }, { email: { contains: q } }, { employeeCode: { contains: q } }];
  }

  const [rows, total, subsidiaries, departments] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      take: 200,
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        status: true,
        joiningDate: true,
        role: { select: { name: true } },
        subsidiary: { select: { name: true } },
        department: { select: { name: true } },
        designation: { select: { name: true } },
        manager: { select: { name: true } },
      },
    }),
    prisma.user.count({ where }),
    isAdmin ? prisma.subsidiary.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    prisma.department.findMany({ distinct: ["name"], orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  const scopeText =
    user.roleName === "HR_MANAGER"
      ? `${user.subsidiary?.name ?? "Your subsidiary"}`
      : isAdmin
        ? "All subsidiaries"
        : "Your team (direct and indirect reports)";

  return (
    <>
      <PageHeader title="Employees" description={scopeText} />

      <Panel title="Directory">
        <form method="get" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input name="q" defaultValue={q} placeholder="Search name, email or code" aria-label="Search" className="lg:col-span-2" />
          {isAdmin ? (
            <select name="sub" defaultValue={sp.sub ?? ""} aria-label="Subsidiary" className={selectClass}>
              <option value="">All subsidiaries</option>
              {subsidiaries.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          ) : null}
          <select name="dept" defaultValue={sp.dept ?? ""} aria-label="Department" className={selectClass}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className={selectClass}>
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit">Apply</Button>
            <Link href="/employees" className="inline-flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-accent">
              Reset
            </Link>
          </div>
        </form>

        {rows.length === 0 ? (
          <EmptyState text="No employees match these filters." />
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">Showing {rows.length} of {total}</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Subsidiary</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Reports to</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.employeeCode} · {r.email}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[r.role.name as RoleName]}</p>
                      </TableCell>
                      <TableCell>{r.subsidiary?.name.replace(/^Cellutech /, "") ?? "—"}</TableCell>
                      <TableCell>{r.department?.name ?? "—"}</TableCell>
                      <TableCell>{r.designation?.name ?? "—"}</TableCell>
                      <TableCell>{r.manager?.name ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(r.joiningDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-medium", STATUS_STYLE[r.status])}>
                          {r.status.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}