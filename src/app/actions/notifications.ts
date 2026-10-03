"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function markAllReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/", "layout"); // refresh the unread badge in the top bar too
}