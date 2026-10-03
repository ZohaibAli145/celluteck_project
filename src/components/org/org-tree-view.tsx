import { ChevronRight } from "lucide-react";
import { ROLE_LABELS, type RoleName } from "@/lib/permissions";
import { initials } from "@/lib/format";
import type { OrgNode } from "@/lib/org-tree";
import { cn } from "@/lib/utils";

const ROLE_STYLE: Record<string, string> = {
  SUPER_ADMIN: "bg-indigo-600 text-white",
  HR_MANAGER: "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300",
  DEPT_HEAD: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  TEAM_LEAD: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  EMPLOYEE: "bg-muted text-muted-foreground",
};

function NodeCard({ node, isMe }: { node: OrgNode; isMe: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex min-w-64 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-xs",
        isMe && "border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-500/30",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
        {initials(node.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {node.name}
          {isMe && <span className="ml-1.5 text-xs font-normal text-indigo-600 dark:text-indigo-400">(you)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {node.designation?.name ?? ROLE_LABELS[node.role.name as RoleName]}
          {node.department && ` · ${node.department.name}`}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", ROLE_STYLE[node.role.name])}>
            {ROLE_LABELS[node.role.name as RoleName]}
          </span>
          {node.subsidiary && <span className="text-[10px] text-muted-foreground">{node.subsidiary.name}</span>}
          {node.directReports > 0 && (
            <span className="text-[10px] text-muted-foreground">{node.directReports} direct report(s)</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Collapsible branch built on native <details> — keyboard accessible, no client JS needed. */
export function OrgTreeNode({ node, depth, currentUserId }: { node: OrgNode; depth: number; currentUserId: string }) {
  const card = <NodeCard node={node} isMe={node.id === currentUserId} />;

  if (node.children.length === 0) return <li>{card}</li>;

  return (
    <li>
      <details open={depth < 2} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          {card}
        </summary>
        <ul className="ml-5 mt-2 space-y-2 border-l border-border pl-5">
          {node.children.map((c) => (
            <OrgTreeNode key={c.id} node={c} depth={depth + 1} currentUserId={currentUserId} />
          ))}
        </ul>
      </details>
    </li>
  );
}