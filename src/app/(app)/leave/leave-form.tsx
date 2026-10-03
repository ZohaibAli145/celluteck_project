"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { submitLeaveAction, type LeaveFormState } from "@/app/actions/leave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface LeaveTypeOption {
  id: string;
  name: string;
  remaining: number;
  requiresEscalation: boolean;
  threshold: number;
}

/** Working days between two ISO dates, skipping weekends and holidays (preview only; server is authoritative). */
function countDays(start: string, end: string, weekend: number[], holidays: Set<string>): number | null {
  if (!start || !end) return null;
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return null;
  if ((e.getTime() - s.getTime()) / 86_400_000 > 366) return null;

  let n = 0;
  const d = new Date(s);
  while (d <= e) {
    if (!weekend.includes(d.getUTCDay()) && !holidays.has(d.toISOString().slice(0, 10))) n++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return n;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs dark:bg-input/30 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

export function LeaveForm({
  types, weekendDays, holidays,
}: {
  types: LeaveTypeOption[];
  weekendDays: number[];
  holidays: string[];
}) {
  const [state, formAction, pending] = useActionState<LeaveFormState, FormData>(submitLeaveAction, {});
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  // Clear the form after a successful submit
  useEffect(() => {
    if (state.success) {
      setStart("");
      setEnd("");
      setReason("");
    }
  }, [state]);

  const selected = types.find((t) => t.id === typeId);
  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  const days = useMemo(
    () => countDays(start, end, weekendDays, holidaySet),
    [start, end, weekendDays, holidaySet],
  );
  const willEscalate = !!selected && days !== null && days > 0 && (selected.requiresEscalation || days > selected.threshold);
  const overBalance = !!selected && days !== null && days > selected.remaining;

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="leaveTypeId">Leave type</Label>
        <select
          id="leaveTypeId"
          name="leaveTypeId"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className={selectClass}
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.remaining} left)
            </option>
          ))}
        </select>
        {fe.leaveTypeId && <p className="text-sm text-red-600 dark:text-red-400">{fe.leaveTypeId[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="startDate">From</Label>
          <Input id="startDate" name="startDate" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          {fe.startDate && <p className="text-sm text-red-600 dark:text-red-400">{fe.startDate[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">To</Label>
          <Input id="endDate" name="endDate" type="date" min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} />
          {fe.endDate && <p className="text-sm text-red-600 dark:text-red-400">{fe.endDate[0]}</p>}
        </div>
      </div>

      {days !== null && (
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          <p className="font-medium">{days} working day(s)</p>
          <p className="text-xs text-muted-foreground">Weekends and public holidays are not counted.</p>
          {days > 0 && willEscalate && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Longer or flagged leave also needs Department Head approval.</p>
          )}
          {overBalance && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">This is more than your remaining balance ({selected?.remaining}).</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea
          id="reason"
          name="reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {fe.reason && <p className="text-sm text-red-600 dark:text-red-400">{fe.reason[0]}</p>}
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          Leave request submitted. Your manager has been notified.
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit request
      </Button>
    </form>
  );
}