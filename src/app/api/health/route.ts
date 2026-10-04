// TEMPORARY diagnostics: open /api/health after deploying. Delete this file once login works.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    databaseUrlScheme: process.env.DATABASE_URL?.split(":")[0] ?? null, // should be "postgresql" (or "postgres")
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
  };
  try {
    const [users, roles] = await Promise.all([prisma.user.count(), prisma.role.count()]);
    return NextResponse.json({ ok: true, users, roles, env });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, env, error: message.slice(-500) }, { status: 500 });
  }
}