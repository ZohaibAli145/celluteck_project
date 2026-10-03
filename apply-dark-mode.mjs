// Run from the project root:  node apply-dark-mode.mjs
// Safe to run twice: already-patched files are skipped.
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? ".";
const file = (p) => path.join(root, p);
let problems = 0;

// ───────── 1. new files ─────────
const NEW_FILES = {
  "src/components/theme-script.tsx": `// Runs before first paint so there is no white flash. Follows the OS theme until the user picks one.
const script = \`(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();\`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
`,
  "src/components/theme-toggle.tsx": `"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pure CSS icon swap + class toggle on <html>: no React state, so no hydration mismatch.
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const dark = root.classList.toggle("dark");
    root.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* storage blocked: theme just won't persist */
    }
  }

  return (
    <Button type="button" variant="ghost" size="icon" className={className} onClick={toggle} aria-label="Toggle dark mode">
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </Button>
  );
}
`,
};
for (const [p, content] of Object.entries(NEW_FILES)) {
  if (fs.existsSync(file(p))) { console.log(`= exists   ${p}`); continue; }
  fs.mkdirSync(path.dirname(file(p)), { recursive: true });
  fs.writeFileSync(file(p), content);
  console.log(`+ created  ${p}`);
}

// ───────── 2. text replacements ─────────
const RED = "text-red-600";
const ERR_BOX_OLD = "bg-red-50 px-3 py-2 text-sm text-red-700";
const ERR_BOX_NEW = "bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300";
const SELECT_OLD = "border border-input bg-transparent px-3 py-1 text-sm shadow-xs";
const SELECT_NEW = "border border-input bg-transparent px-3 py-1 text-sm shadow-xs dark:bg-input/30";

const EDITS = {
  "src/app/login/page.tsx": [
    ['import { LoginForm } from "./login-form";', 'import { LoginForm } from "./login-form";\nimport { ThemeToggle } from "@/components/theme-toggle";'],
    ['<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">',
     '<main className="relative flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">\n      <ThemeToggle className="absolute right-4 top-4" />'],
  ],
  "src/app/login/login-form.tsx": [[RED, `${RED} dark:text-red-400`], [ERR_BOX_OLD, ERR_BOX_NEW]],
  "src/app/(app)/layout.tsx": [
    ["flex min-h-screen bg-slate-50", "flex min-h-screen bg-muted/40"],
    ["border-r bg-white md:block", "border-r bg-card md:block"],
  ],
  "src/components/topbar.tsx": [
    ['import { cn } from "@/lib/utils";', 'import { cn } from "@/lib/utils";\nimport { ThemeToggle } from "@/components/theme-toggle";'],
    ["border-b bg-white/90 px-4", "border-b bg-background/90 px-4"],
    ['<div className="ml-auto flex items-center gap-2">', '<div className="ml-auto flex items-center gap-2">\n        <ThemeToggle />'],
    ["bg-indigo-100 text-sm font-semibold text-indigo-700", "bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"],
  ],
  "src/components/app-sidebar.tsx": [
    ['active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"',
     'active ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"'],
  ],
  "src/components/dashboard/widgets.tsx": [
    ["bg-indigo-50 p-2.5 text-indigo-600", "bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"],
    ["mt-1 text-xs text-slate-400", "mt-1 text-xs text-muted-foreground"],
    ["font-medium text-indigo-600 hover:underline", "font-medium text-indigo-600 hover:underline dark:text-indigo-400"],
  ],
  "src/components/dashboard/views.tsx": [
    ["font-medium text-indigo-600 hover:underline", "font-medium text-indigo-600 hover:underline dark:text-indigo-400"],
  ],
  "src/components/status-badge.tsx": [
    ['PENDING: "border-amber-200 bg-amber-50 text-amber-800"', 'PENDING: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"'],
    ['APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800"', 'APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"'],
    ['REJECTED: "border-red-200 bg-red-50 text-red-800"', 'REJECTED: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"'],
    ['CANCELLED: "border-slate-200 bg-slate-100 text-slate-600"', 'CANCELLED: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"'],
  ],
  "src/components/charts.tsx": [
    ['stroke="#e2e8f0"', 'stroke="var(--border)"'],
    ['<Tooltip cursor={{ fill: "#f1f5f9" }} />', '<Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--popover-foreground)" }} />'],
    ['<Tooltip />', '<Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--popover-foreground)" }} />'],
    ['<XAxis dataKey="name" tick={{ fontSize: 12 }}', '<XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}'],
    ['<YAxis allowDecimals={false} domain={[0, yMax ?? "auto"]} tick={{ fontSize: 12 }}', '<YAxis allowDecimals={false} domain={[0, yMax ?? "auto"]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}'],
    ['{series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}', '{series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />}'],
    ['<Legend wrapperStyle={{ fontSize: 12 }} />\n        </PieChart>', '<Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />\n        </PieChart>'],
    ['paddingAngle={2}>', 'paddingAngle={2} stroke="var(--card)">'],
    ['function ChartEmpty() {', `const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
};
const legendText = (value: string) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>;

function ChartEmpty() {`],
  ],
  "src/lib/format.ts": [['primary: "#4f46e5"', 'primary: "#6366f1"']],
  "src/app/(app)/leave/page.tsx": [
    ["rounded-xl border bg-white p-4", "rounded-xl border bg-card p-4"],
    ["overflow-hidden rounded-full bg-slate-100", "overflow-hidden rounded-full bg-muted"],
    ["text-sm text-slate-600", "text-sm text-foreground/80"],
  ],
  "src/app/(app)/leave/leave-form.tsx": [
    [SELECT_OLD, SELECT_NEW],
    [RED, `${RED} dark:text-red-400`],
    ["rounded-md bg-slate-50 px-3 py-2 text-sm", "rounded-md bg-muted px-3 py-2 text-sm"],
    ["mt-1 text-xs text-amber-700", "mt-1 text-xs text-amber-700 dark:text-amber-400"],
    [ERR_BOX_OLD, ERR_BOX_NEW],
    ["bg-emerald-50 px-3 py-2 text-sm text-emerald-700", "bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"],
  ],
  "src/app/(app)/approvals/page.tsx": [["text-sm text-slate-600", "text-sm text-foreground/80"]],
  "src/app/(app)/approvals/decision-dialog.tsx": [
    ["border-red-200 text-red-700 hover:bg-red-50", "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"],
    [RED, `${RED} dark:text-red-400`],
    [ERR_BOX_OLD, ERR_BOX_NEW],
  ],
  "src/app/(app)/employees/page.tsx": [
    ['ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800"', 'ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"'],
    ['ON_LEAVE: "border-amber-200 bg-amber-50 text-amber-800"', 'ON_LEAVE: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"'],
    ['TERMINATED: "border-slate-200 bg-slate-100 text-slate-600"', 'TERMINATED: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"'],
    [SELECT_OLD, SELECT_NEW],
    ["text-sm text-slate-600 hover:bg-slate-100", "text-sm text-muted-foreground hover:bg-accent"],
    ["text-[11px] text-slate-400", "text-[11px] text-muted-foreground"],
  ],
  "src/app/(app)/leave-calendar/page.tsx": [
    ["rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-50", "rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-accent"],
    ["ml-2 text-sm text-indigo-600 hover:underline", "ml-2 text-sm text-indigo-600 hover:underline dark:text-indigo-400"],
    ["h-3 w-3 rounded-sm bg-amber-300", "h-3 w-3 rounded-sm bg-amber-300 dark:bg-amber-500"],
    ["h-3 w-3 rounded-sm bg-rose-100 ring-1 ring-rose-200", "h-3 w-3 rounded-sm bg-rose-100 ring-1 ring-rose-200 dark:bg-rose-500/25 dark:ring-rose-500/40"],
    ["h-3 w-3 rounded-sm bg-slate-100 ring-1 ring-slate-200", "h-3 w-3 rounded-sm bg-muted ring-1 ring-border"],
    ["sticky left-0 z-10 min-w-40 bg-white px-2", "sticky left-0 z-10 min-w-40 bg-card px-2"],
    ['isWeekend(d) && "text-slate-400"', 'isWeekend(d) && "text-muted-foreground/60"'],
    ["sticky left-0 z-10 whitespace-nowrap bg-white px-2", "sticky left-0 z-10 whitespace-nowrap bg-card px-2"],
    ['"h-7 w-7 border border-white"', '"h-7 w-7 border border-card"'],
    ['? "bg-emerald-500" : "bg-amber-300"', '? "bg-emerald-500" : "bg-amber-300 dark:bg-amber-500"'],
    ['holiday ? "bg-rose-100" : isWeekend(d) ? "bg-slate-100" : "bg-slate-50"', 'holiday ? "bg-rose-100 dark:bg-rose-500/25" : isWeekend(d) ? "bg-muted" : "bg-muted/40"'],
    ["sticky left-0 z-10 bg-white px-2 pt-2", "sticky left-0 z-10 bg-card px-2 pt-2"],
    ['"font-semibold text-red-600" : "text-slate-400"', '"font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground"'],
  ],
  "src/app/(app)/notifications/page.tsx": [
    ['n.isRead ? "text-slate-300" : "text-indigo-600"', 'n.isRead ? "text-muted-foreground/40" : "text-indigo-600 dark:text-indigo-400"'],
    ["rounded-full bg-indigo-600\"", "rounded-full bg-indigo-600 dark:bg-indigo-400\""],
    ["block hover:bg-slate-50", "block hover:bg-accent"],
  ],
  "src/app/(app)/org-chart/page.tsx": [
    ['"bg-white text-slate-600 hover:bg-slate-50"', '"bg-card text-muted-foreground hover:bg-accent"'],
  ],
  "src/components/org/org-tree-view.tsx": [
    ['HR_MANAGER: "bg-teal-100 text-teal-800"', 'HR_MANAGER: "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300"'],
    ['DEPT_HEAD: "bg-amber-100 text-amber-800"', 'DEPT_HEAD: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"'],
    ['TEAM_LEAD: "bg-sky-100 text-sky-800"', 'TEAM_LEAD: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300"'],
    ['EMPLOYEE: "bg-slate-100 text-slate-700"', 'EMPLOYEE: "bg-muted text-muted-foreground"'],
    ["rounded-xl border bg-white px-3", "rounded-xl border bg-card px-3"],
    ['"border-indigo-400 ring-2 ring-indigo-100"', '"border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-500/30"'],
    ["bg-indigo-50 text-sm font-semibold text-indigo-700", "bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"],
    ["ml-1.5 text-xs font-normal text-indigo-600", "ml-1.5 text-xs font-normal text-indigo-600 dark:text-indigo-400"],
    ['text-[10px] text-slate-400">{node.subsidiary', 'text-[10px] text-muted-foreground">{node.subsidiary'],
    ['text-[10px] text-slate-400">{node.directReports}', 'text-[10px] text-muted-foreground">{node.directReports}'],
    ["shrink-0 text-slate-400 transition-transform", "shrink-0 text-muted-foreground transition-transform"],
    ["border-l border-slate-200 pl-5", "border-l border-border pl-5"],
  ],
};

for (const [p, edits] of Object.entries(EDITS)) {
  if (!fs.existsSync(file(p))) { console.log(`! MISSING FILE ${p}`); problems++; continue; }
  let s = fs.readFileSync(file(p), "utf8");
  let changed = 0;
  for (const [oldS, newS] of edits) {
    if (newS.includes(oldS)) {
      if (s.includes(newS)) continue;               // already patched (new text extends old text)
    } else if (!s.includes(oldS)) {
      if (s.includes(newS)) continue;               // already patched
      console.log(`! not found in ${p}: ${oldS.slice(0, 60)}`); problems++; continue;
    }
    s = s.split(oldS).join(newS);
    changed++;
  }
  if (changed) fs.writeFileSync(file(p), s);
  console.log(`${changed ? "~ patched " : "= up to date"} ${p}${changed ? ` (${changed})` : ""}`);
}

// ───────── 3. root layout: add script + suppressHydrationWarning ─────────
const layoutPath = "src/app/layout.tsx";
if (fs.existsSync(file(layoutPath))) {
  let s = fs.readFileSync(file(layoutPath), "utf8");
  if (s.includes("ThemeScript")) console.log(`= up to date ${layoutPath}`);
  else {
    const htmlTag = /<html([^>]*)>/;
    if (!htmlTag.test(s)) { console.log(`! could not find <html> in ${layoutPath}`); problems++; }
    else {
      s = s.replace(htmlTag, (_m, attrs) => `<html${attrs.includes("suppressHydrationWarning") ? attrs : attrs + " suppressHydrationWarning"}>\n      <head>\n        <ThemeScript />\n      </head>`);
      const lastImport = [...s.matchAll(/^import .*;$/gm)].pop();
      const at = lastImport.index + lastImport[0].length;
      s = s.slice(0, at) + '\nimport { ThemeScript } from "@/components/theme-script";' + s.slice(at);
      fs.writeFileSync(file(layoutPath), s);
      console.log(`~ patched  ${layoutPath}`);
    }
  }
} else { console.log(`! MISSING FILE ${layoutPath}`); problems++; }

// ───────── 4. Tailwind v4 'dark' variant must be class-based ─────────
const cssPath = "src/app/globals.css";
if (fs.existsSync(file(cssPath))) {
  let s = fs.readFileSync(file(cssPath), "utf8");
  if (/@custom-variant\s+dark/.test(s)) console.log(`= up to date ${cssPath}`);
  else {
    const imports = [...s.matchAll(/^@import .*;$/gm)];
    const at = imports.length ? imports[imports.length - 1].index + imports[imports.length - 1][0].length : 0;
    s = s.slice(0, at) + "\n\n@custom-variant dark (&:is(.dark *));" + s.slice(at);
    fs.writeFileSync(file(cssPath), s);
    console.log(`~ patched  ${cssPath} (added @custom-variant dark)`);
  }
  if (!/\.dark\s*\{/.test(fs.readFileSync(file(cssPath), "utf8"))) {
    console.log("! globals.css has no .dark { ... } colour block - re-run: npx shadcn@latest init"); problems++;
  }
} else { console.log(`! MISSING FILE ${cssPath}`); problems++; }

console.log(problems ? `\nDone with ${problems} problem(s) - send me the lines starting with '!'.` : "\nAll done. Restart: npm run dev");