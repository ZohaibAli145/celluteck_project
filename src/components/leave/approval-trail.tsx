import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface TrailStep {
  id: string;
  level: number;
  decision: string;
  comment: string | null;
  decidedAt: Date | null;
  approver: { name: string };
}

const DOT: Record<string, string> = {
  APPROVED: "bg-emerald-500",
  REJECTED: "bg-red-500",
  PENDING: "bg-amber-400",
};
const WORDS: Record<string, string> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PENDING: "Waiting",
};

/** Audit trail of a leave request: who decided what, when, and why. */
export function ApprovalTrail({ steps }: { steps: TrailStep[] }) {
  if (steps.length === 0) {
    return <p className="text-xs text-muted-foreground">Auto-approved — no approver above you.</p>;
  }
  return (
    <ol className="space-y-2">
      {steps.map((s) => (
        <li key={s.id} className="flex gap-2 text-xs">
          <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", DOT[s.decision] ?? "bg-slate-300")} />
          <div>
            <p>
              <span className="font-medium">
                Level {s.level} · {s.level === 1 ? "Line manager" : "Department Head"} · {s.approver.name}
              </span>{" "}
              — {WORDS[s.decision] ?? s.decision}
              {s.decidedAt && ` on ${formatDate(s.decidedAt)}`}
            </p>
            {s.comment && <p className="text-muted-foreground">&ldquo;{s.comment}&rdquo;</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}