import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { parseWeekend } from "@/lib/leave";
import { EmptyState, HolidayList, PageHeader, Panel } from "@/components/dashboard/widgets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Organization · Cellutech HRMS" };
export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const activeOnly = { where: { status: { not: "TERMINATED" } } };

export default async function OrganizationPage() {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER");

  // Super Admin sees every subsidiary; an HR Manager only their own.
  const subsidiaries = await prisma.subsidiary.findMany({
    where: user.roleName === "HR_MANAGER" ? { id: user.subsidiaryId ?? "none" } : {},
    orderBy: { name: "asc" },
    include: {
      country: true,
      _count: { select: { users: activeOnly } },
      departments: {
        orderBy: { name: "asc" },
        include: {
          designations: { orderBy: { name: "asc" } },
          _count: { select: { users: activeOnly } },
        },
      },
      holidays: { orderBy: { date: "asc" } },
    },
  });

  return (
    <>
      <PageHeader
        title="Organization"
        description={
          user.roleName === "SUPER_ADMIN"
            ? "Countries, subsidiaries, departments and holiday calendars"
            : "Your subsidiary, departments and holiday calendar"
        }
      />

      {subsidiaries.length === 0 ? (
        <EmptyState text="No subsidiaries found." />
      ) : (
        <div className="space-y-4">
          {subsidiaries.map((s) => (
            <Panel
              key={s.id}
              title={s.name}
              description={`${s.city}, ${s.country.name} · ${s.timezone} · ${s.currency} · weekend: ${parseWeekend(s.weekendDays).map((d) => DAY_NAMES[d]).join(", ")} · ${s._count.users} employees`}
            >
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="overflow-x-auto lg:col-span-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Headcount</TableHead>
                        <TableHead>Designations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.departments.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell className="text-right">{d._count.users}</TableCell>
                          <TableCell className="text-muted-foreground">{d.designations.map((g) => g.name).join(", ")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">Public holidays ({s.holidays.length})</p>
                  <HolidayList holidays={s.holidays} />
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}