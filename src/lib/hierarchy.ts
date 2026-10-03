// Reporting-hierarchy helpers (SRS 3.4):
//  - getManagerChain: full chain upwards  (drives leave escalation)
//  - getAllReportIds: direct + indirect reports (drives team dashboards)
import { prisma } from "./prisma";
import type { RoleName } from "./permissions";

const MAX_DEPTH = 25; // safety net against bad data / cycles

type ManagerNode = { id: string; name: string; status: string; role: { name: string } };
type ManagerRow = { manager: ManagerNode | null } | null;

export interface ChainMember {
  id: string;
  name: string;
  roleName: RoleName;
}

/** [direct manager, manager's manager, ... top]. Deactivated managers are skipped. */
export async function getManagerChain(userId: string): Promise<ChainMember[]> {
  const chain: ChainMember[] = [];
  const seen = new Set<string>([userId]);
  let currentId: string | null = userId;

  while (currentId && chain.length < MAX_DEPTH) {
    const row: ManagerRow = await prisma.user.findUnique({
      where: { id: currentId },
      select: {
        manager: { select: { id: true, name: true, status: true, role: { select: { name: true } } } },
      },
    });
    const m: ManagerNode | null = row?.manager ?? null;
    if (!m || seen.has(m.id)) break;
    seen.add(m.id);
    if (m.status !== "TERMINATED") {
      chain.push({ id: m.id, name: m.name, roleName: m.role.name as RoleName });
    }
    currentId = m.id;
  }
  return chain;
}

/** Ids of everyone below this user in the tree (breadth-first). */
export async function getAllReportIds(userId: string): Promise<string[]> {
  const result: string[] = [];
  const seen = new Set<string>([userId]);
  let frontier = [userId];

  while (frontier.length > 0 && result.length < 100_000) {
    const rows = await prisma.user.findMany({
      where: { managerId: { in: frontier }, status: { not: "TERMINATED" } },
      select: { id: true },
    });
    frontier = rows.map((r) => r.id).filter((id) => !seen.has(id));
    frontier.forEach((id) => seen.add(id));
    result.push(...frontier);
  }
  return result;
}