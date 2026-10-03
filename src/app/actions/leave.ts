"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  buildApprovalChain,
  countLeaveDays,
  getRemainingBalance,
  iso,
  needsEscalation,
  toUtcDate,
} from "@/lib/leave";

export interface LeaveFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

type Tx = Prisma.TransactionClient;

function notify(tx: Tx, userId: string, message: string, link: string) {
  return tx.notification.create({ data: { userId, message, link } });
}

function refresh() {
  for (const p of ["/leave", "/approvals", "/dashboard", "/leave-calendar"]) revalidatePath(p);
}

// ───────────── submit ─────────────

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");
const submitSchema = z.object({
  leaveTypeId: z.string().min(1, "Select a leave type"),
  startDate: dateField,
  endDate: dateField,
  reason: z.string().trim().min(5, "Please give a short reason").max(500, "Max 500 characters"),
});

export async function submitLeaveAction(_prev: LeaveFormState, formData: FormData): Promise<LeaveFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.subsidiaryId) return { error: "Your account is not linked to a subsidiary." };

  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const start = toUtcDate(parsed.data.startDate);
  const end = toUtcDate(parsed.data.endDate);
  if (!start) return { fieldErrors: { startDate: ["Pick a valid date"] } };
  if (!end) return { fieldErrors: { endDate: ["Pick a valid date"] } };
  if (end < start) return { fieldErrors: { endDate: ["End date must be on or after the start date"] } };
  if (end.getTime() - start.getTime() > 366 * 86_400_000) return { error: "Leave range is too long." };

  // Leave type must belong to the user's own subsidiary (policies are per subsidiary)
  const leaveType = await prisma.leaveType.findFirst({
    where: { id: parsed.data.leaveTypeId, subsidiaryId: user.subsidiaryId },
  });
  if (!leaveType) return { fieldErrors: { leaveTypeId: ["Invalid leave type"] } };

  const totalDays = await countLeaveDays(user.subsidiaryId, start, end);
  if (totalDays <= 0) {
    return { error: "The selected dates only contain weekends / public holidays — no leave needed." };
  }

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      userId: user.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { startDate: true, endDate: true },
  });
  if (overlap) {
    return { error: `You already have a leave request covering ${iso(overlap.startDate)} → ${iso(overlap.endDate)}.` };
  }

  const balance = await getRemainingBalance(user.id, leaveType.id, start.getUTCFullYear());
  if (!balance) return { error: `No ${leaveType.name} balance is set up for ${start.getUTCFullYear()}.` };
  if (totalDays > balance.remaining) {
    return {
      error: `Insufficient ${leaveType.name} balance: ${balance.remaining} day(s) left, ${totalDays} requested.`,
    };
  }

  const escalate = needsEscalation(totalDays, leaveType);
  const chain = await buildApprovalChain(user.id, escalate);
  const autoApproved = chain.length === 0;
  const range = `${iso(start)} → ${iso(end)}`;

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.create({
      data: {
        userId: user.id,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        totalDays,
        reason: parsed.data.reason,
        status: autoApproved ? "APPROVED" : "PENDING",
        currentApprovalStep: 1,
        requiresEscalation: chain.length > 1,
        steps: { create: chain.map((c) => ({ approverId: c.approverId, level: c.level })) },
      },
    });

    if (autoApproved) {
      await tx.leaveBalance.updateMany({
        where: { userId: user.id, leaveTypeId: leaveType.id, year: start.getUTCFullYear() },
        data: { used: { increment: totalDays } },
      });
      await notify(tx, user.id, `Your ${leaveType.name} (${range}) was auto-approved (no manager above you).`, "/leave");
    } else {
      await notify(
        tx,
        chain[0].approverId,
        `${user.name} requested ${leaveType.name} (${range}, ${totalDays} day(s)) — your approval is needed.`,
        "/approvals",
      );
    }
  });

  refresh();
  return { success: true };
}

// ───────────── approve / reject ─────────────

const decideSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().max(500).optional(),
});

export async function decideLeaveAction(_prev: LeaveFormState, formData: FormData): Promise<LeaveFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = decideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  const { requestId, decision } = parsed.data;
  const comment = parsed.data.comment || "";

  const req = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: {
      steps: { orderBy: { level: "asc" } },
      leaveType: true,
      user: { select: { id: true, name: true, subsidiaryId: true } },
    },
  });
  if (!req) return { error: "Leave request not found." };
  if (req.status !== "PENDING") return { error: "This request has already been finalised." };
  if (req.userId === user.id) return { error: "You cannot decide on your own leave request." };

  const step = req.steps.find((s) => s.level === req.currentApprovalStep && s.decision === "PENDING");
  if (!step) return { error: "No pending approval step found." };

  // RBAC is enforced here on the server, not just by hiding buttons
  const isAssigned = step.approverId === user.id;
  const isOverride =
    !isAssigned &&
    (user.roleName === "SUPER_ADMIN" ||
      (user.roleName === "HR_MANAGER" && user.subsidiaryId === req.user.subsidiaryId));
  if (!isAssigned && !isOverride) return { error: "You are not allowed to decide this request." };

  if ((isOverride || decision === "REJECTED") && comment.length < 5) {
    return {
      fieldErrors: { comment: [isOverride ? "An override needs a comment (min 5 characters)" : "Please explain the rejection (min 5 characters)"] },
    };
  }

  const label = isOverride ? `[Override by ${user.name}] ` : "";
  const range = `${iso(req.startDate)} → ${iso(req.endDate)}`;

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Atomic claim: protects against two people deciding the same step at once
      const claimed = await tx.leaveApprovalStep.updateMany({
        where: { id: step.id, decision: "PENDING" },
        data: { decision, comment: `${label}${comment}` || null, decidedAt: now, approverId: user.id },
      });
      if (claimed.count === 0) throw new Error("ALREADY_DECIDED");

      const later = req.steps.filter((s) => s.level > step.level && s.decision === "PENDING");
      const finalStatus =
        decision === "REJECTED" ? "REJECTED" : isOverride || later.length === 0 ? "APPROVED" : "PENDING";

      // An override is final: close any remaining steps with the same decision
      if (isOverride && later.length > 0) {
        await tx.leaveApprovalStep.updateMany({
          where: { leaveRequestId: req.id, decision: "PENDING" },
          data: { decision, comment: `${label}Closed by override`, decidedAt: now },
        });
      }

      if (finalStatus === "PENDING") {
        const next = later[0];
        await tx.leaveRequest.update({ where: { id: req.id }, data: { currentApprovalStep: next.level } });
        await notify(
          tx,
          next.approverId,
          `${req.user.name}'s ${req.leaveType.name} (${range}) needs your approval (escalated).`,
          "/approvals",
        );
        await notify(
          tx,
          req.userId,
          `Your ${req.leaveType.name} (${range}) was approved by your manager and is now awaiting the Department Head.`,
          "/leave",
        );
        return;
      }

      await tx.leaveRequest.update({ where: { id: req.id }, data: { status: finalStatus } });
      if (finalStatus === "APPROVED") {
        await tx.leaveBalance.updateMany({
          where: { userId: req.userId, leaveTypeId: req.leaveTypeId, year: req.startDate.getUTCFullYear() },
          data: { used: { increment: req.totalDays } },
        });
      }
      await notify(
        tx,
        req.userId,
        `Your ${req.leaveType.name} (${range}) was ${finalStatus.toLowerCase()}${comment ? `: "${comment}"` : "."}`,
        "/leave",
      );
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_DECIDED") {
      return { error: "Someone else has already decided this request." };
    }
    throw e;
  }

  refresh();
  return { success: true };
}

// ───────────── cancel (own pending request) ─────────────

export async function cancelLeaveAction(requestId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const req = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: { steps: true, leaveType: true },
  });
  if (!req || req.userId !== user.id) throw new Error("Forbidden");
  if (req.status !== "PENDING") throw new Error("Only pending requests can be cancelled.");

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({ where: { id: req.id }, data: { status: "CANCELLED" } });
    const waiting = req.steps.find((s) => s.level === req.currentApprovalStep && s.decision === "PENDING");
    if (waiting) {
      await notify(
        tx,
        waiting.approverId,
        `${user.name} cancelled the ${req.leaveType.name} request (${iso(req.startDate)} → ${iso(req.endDate)}).`,
        "/approvals",
      );
    }
  });
  refresh();
}