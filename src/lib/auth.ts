// Server-side helpers. Never trust the UI: every page / action calls one of these.
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { SESSION_COOKIE, verifySession } from "./session";
import type { RoleName } from "./permissions";

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** Fresh user from the DB (so a deactivated user loses access immediately). */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      role: true,
      subsidiary: { include: { country: true } },
      department: true,
      designation: true,
      manager: { select: { id: true, name: true } },
    },
  });
  if (!user || user.status === "TERMINATED") return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return { ...safe, roleName: user.role.name as RoleName };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For pages: redirects to /login when not signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: redirects to /dashboard when the role is not allowed. */
export async function requireRole(...roles: RoleName[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.roleName)) redirect("/dashboard");
  return user;
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertRole(...roles: RoleName[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!roles.includes(user.roleName)) throw new Error("Forbidden");
  return user;
}