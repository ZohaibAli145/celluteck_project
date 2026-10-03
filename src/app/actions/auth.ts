"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";
import type { RoleName } from "@/lib/permissions";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginState {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { role: true },
  });

  // Same message for "no such user" and "wrong password" (no account enumeration)
  const valid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) return { error: "Invalid email or password." };
  if (user.status === "TERMINATED") return { error: "This account has been deactivated." };

  const token = await signSession({
    userId: user.id,
    role: user.role.name as RoleName,
    name: user.name,
    email: user.email,
    subsidiaryId: user.subsidiaryId,
    departmentId: user.departmentId,
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  // Only allow same-site relative redirects
  const from = String(formData.get("from") ?? "");
  redirect(from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}