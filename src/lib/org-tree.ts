// Pure helper: turns a flat user list (with managerId) into a reporting tree.
export interface OrgUser {
  id: string;
  name: string;
  managerId: string | null;
  subsidiaryId: string | null;
  role: { name: string };
  designation: { name: string } | null;
  department: { name: string } | null;
  subsidiary: { name: string } | null;
}

export interface OrgNode extends OrgUser {
  children: OrgNode[];
  directReports: number; // real count from all data, even if the view is filtered
}

const ROLE_ORDER: Record<string, number> = {
  SUPER_ADMIN: 0, HR_MANAGER: 1, DEPT_HEAD: 2, TEAM_LEAD: 3, EMPLOYEE: 4,
};

/**
 * scopeSubsidiaryId = null -> whole company.
 * Otherwise: everyone in that subsidiary plus their manager chain up to the top,
 * so the tree always has a root and the reporting line stays visible.
 */
export function buildOrgTree(users: OrgUser[], scopeSubsidiaryId: string | null): OrgNode[] {
  const byId = new Map(users.map((u) => [u.id, u]));

  const directCount = new Map<string, number>();
  for (const u of users) {
    if (u.managerId) directCount.set(u.managerId, (directCount.get(u.managerId) ?? 0) + 1);
  }

  const included = new Set<string>();
  for (const u of users) {
    if (scopeSubsidiaryId && u.subsidiaryId !== scopeSubsidiaryId) continue;
    let cur: OrgUser | undefined = u;
    let guard = 0;
    while (cur && !included.has(cur.id) && guard++ < 50) {
      included.add(cur.id);
      cur = cur.managerId ? byId.get(cur.managerId) : undefined;
    }
  }

  const nodes = new Map<string, OrgNode>();
  for (const id of included) {
    const u = byId.get(id)!;
    nodes.set(id, { ...u, children: [], directReports: directCount.get(id) ?? 0 });
  }

  const roots: OrgNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.managerId ? nodes.get(n.managerId) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }

  const sort = (list: OrgNode[]) => {
    list.sort(
      (a, b) =>
        (ROLE_ORDER[a.role.name] ?? 9) - (ROLE_ORDER[b.role.name] ?? 9) || a.name.localeCompare(b.name),
    );
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export function countNodes(nodes: OrgNode[]): number {
  return nodes.reduce((n, node) => n + 1 + countNodes(node.children), 0);
}