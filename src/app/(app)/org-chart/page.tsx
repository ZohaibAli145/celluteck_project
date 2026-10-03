import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildOrgTree, countNodes } from "@/lib/org-tree";
import { OrgTreeNode } from "@/components/org/org-tree-view";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/widgets";
import { cn } from "@/lib/utils";

export const metadata = { title: "Org Chart · Cellutech HRMS" };
export const dynamic = "force-dynamic";

export default async function OrgChartPage({ searchParams }: { searchParams: Promise<{ sub?: string }> }) {
  const user = await requireUser();
  const { sub } = await searchParams;
  const isAdmin = user.roleName === "SUPER_ADMIN";

  // Super Admin can view the consolidated global chart or filter by subsidiary.
  const subsidiaries = isAdmin
    ? await prisma.subsidiary.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];
  const picked = subsidiaries.find((s) => s.id === sub);
  const scope = isAdmin ? (picked?.id ?? null) : user.subsidiaryId;

  const users = await prisma.user.findMany({
    where: { status: { not: "TERMINATED" } },
    select: {
      id: true,
      name: true,
      managerId: true,
      subsidiaryId: true,
      role: { select: { name: true } },
      designation: { select: { name: true } },
      department: { select: { name: true } },
      subsidiary: { select: { name: true } },
    },
  });

  const roots = buildOrgTree(users, scope);
  const total = countNodes(roots);

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm transition-colors",
      active ? "border-indigo-600 bg-indigo-600 text-white" : "bg-card text-muted-foreground hover:bg-accent",
    );

  return (
    <>
      <PageHeader
        title="Organization Chart"
        description={
          isAdmin
            ? picked ? `${picked.name} — reporting structure` : "Global reporting structure"
            : `${user.subsidiary?.name ?? "Your subsidiary"} — reporting structure`
        }
      />

      {isAdmin && (
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter by subsidiary">
          <Link href="/org-chart" className={chip(!picked)}>All subsidiaries</Link>
          {subsidiaries.map((s) => (
            <Link key={s.id} href={`/org-chart?sub=${s.id}`} className={chip(picked?.id === s.id)}>
              {s.name.replace(/^Cellutech /, "")}
            </Link>
          ))}
        </div>
      )}

      <Panel title={`${total} people`} description="Click the arrow to expand or collapse a branch. Your own box is highlighted.">
        {roots.length === 0 ? (
          <EmptyState text="No employees to show." />
        ) : (
          <div className="overflow-x-auto pb-2">
            <ul className="space-y-2">
              {roots.map((r) => (
                <OrgTreeNode key={r.id} node={r} depth={0} currentUserId={user.id} />
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </>
  );
}