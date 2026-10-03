// Small formatting helpers + shared chart colours (plain module so server components can import it).
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatDateRange = (a: Date, b: Date) =>
  a.getTime() === b.getTime() ? formatDate(a) : `${formatDate(a)} – ${formatDate(b)}`;

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export const pct = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

export const shortLeaveName = (name: string) =>
  name.replace("Maternity / Paternity Leave", "Mat/Pat").replace(/ Leave$/, "");

export const shortSubName = (name: string) => name.replace(/^Cellutech /, "");

export const CHART_COLORS = {
  primary: "#6366f1",
  teal: "#0d9488",
  amber: "#f59e0b",
  green: "#10b981",
  slate: "#94a3b8",
  red: "#ef4444",
  palette: ["#4f46e5", "#0d9488", "#f59e0b", "#ec4899", "#06b6d4", "#84cc16"],
};

export const ATTENDANCE_COLORS: Record<string, string> = {
  PRESENT: "#10b981",
  LATE: "#f59e0b",
  WFH: "#6366f1",
  ABSENT: "#ef4444",
  ON_LEAVE: "#94a3b8",
};

export const ATTENDANCE_LABELS: Record<string, string> = {
  PRESENT: "Present",
  LATE: "Late",
  WFH: "Remote",
  ABSENT: "Absent",
  ON_LEAVE: "On leave",
};