import { requireUser } from "@/lib/auth";
import { EmployeeView, GlobalView, SubsidiaryView, TeamView } from "@/components/dashboard/views";

export const metadata = { title: "Dashboard · Cellutech HRMS" };
export const dynamic = "force-dynamic"; // always live data

export default async function DashboardPage() {
  const user = await requireUser();

  switch (user.roleName) {
    case "SUPER_ADMIN":
      return <GlobalView user={user} />;
    case "HR_MANAGER":
      return <SubsidiaryView user={user} />;
    case "DEPT_HEAD":
    case "TEAM_LEAD":
      return <TeamView user={user} />;
    default:
      return <EmployeeView user={user} />;
  }
}