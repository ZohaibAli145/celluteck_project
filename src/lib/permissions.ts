// Single source of truth for roles and which routes each role may open.
// Used by: middleware (route guard), sidebar (navigation), server actions (RBAC).

export const ROLES = ["SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD", "TEAM_LEAD", "EMPLOYEE"] as const;
export type RoleName = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_MANAGER: "HR Manager",
  DEPT_HEAD: "Department Head",
  TEAM_LEAD: "Team Lead",
  EMPLOYEE: "Employee",
};

const ALL: readonly RoleName[] = ROLES;
const MANAGERS: readonly RoleName[] = ["SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD", "TEAM_LEAD"];
const ADMINS: readonly RoleName[] = ["SUPER_ADMIN", "HR_MANAGER"];

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide-react icon name, resolved in the sidebar
  roles: readonly RoleName[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ALL },
  { href: "/leave", label: "My Leave", icon: "CalendarPlus", roles: ALL },
  { href: "/approvals", label: "Approvals", icon: "CheckCircle2", roles: MANAGERS },
  { href: "/leave-calendar", label: "Leave Calendar", icon: "CalendarDays", roles: ALL },
  { href: "/employees", label: "Employees", icon: "Users", roles: MANAGERS },
  { href: "/org-chart", label: "Org Chart", icon: "Network", roles: ALL },
  { href: "/organization", label: "Organization", icon: "Building2", roles: ADMINS },
];

/** Routes not listed in NAV_ITEMS only need a valid login. */
export function canAccess(pathname: string, role: RoleName): boolean {
  const item = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  return item ? item.roles.includes(role) : true;
}

export function navFor(role: RoleName): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}