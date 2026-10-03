"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { decideLeaveAction, type LeaveFormState } from "@/app/actions/leave";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DecisionDialog({
  requestId, decision, employee, commentRequired,
}: {
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  employee: string;
  commentRequired: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<LeaveFormState, FormData>(decideLeaveAction, {});
  const approve = decision === "APPROVED";
  const fieldId = `comment-${requestId}-${decision}`;

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state]);

  return (
    <>
      {/* Opened with state (not a trigger component) so it works with any shadcn flavour */}
      <Button
        type="button"
        size="sm"
        variant={approve ? "default" : "outline"}
        className={approve ? "" : "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"}
        onClick={() => setOpen(true)}
      >
        {approve ? "Approve" : "Reject"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approve ? "Approve" : "Reject"} leave request</DialogTitle>
            <DialogDescription>
              {employee}&apos;s request will be {approve ? "approved" : "rejected"}. This is recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="decision" value={decision} />

            <div className="space-y-2">
              <Label htmlFor={fieldId}>Comment {commentRequired ? "(required)" : "(optional)"}</Label>
              <Textarea id={fieldId} name="comment" rows={3} maxLength={500} />
              {state.fieldErrors?.comment && <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.comment[0]}</p>}
            </div>

            {state.error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {state.error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={pending} variant={approve ? "default" : "destructive"}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm {approve ? "approval" : "rejection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}