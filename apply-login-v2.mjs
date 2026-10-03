// Run from the project root:  node apply-login-v2.mjs
// Safe to run twice. Replaces the login UI with a Cellutech-branded SaaS layout + animations.
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? ".";
const file = (p) => path.join(root, p);
let problems = 0;

// ───────── 1. brand mark + animated hero panel ─────────
const HERO = `import type { CSSProperties } from "react";
import { CalendarCheck, CheckCircle2, ShieldCheck } from "lucide-react";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25z" fill="currentColor" opacity="0.18" />
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="4.2" fill="currentColor" />
    </svg>
  );
}

const BARS = [38, 62, 48, 80, 56, 92, 70];
const AWAY = ["AK", "SM", "RH", "ZB"];
const d = (n: number) => ({ "--d": n + "ms" }) as CSSProperties;

export function LoginHero() {
  return (
    <aside className="login-hero relative hidden flex-col overflow-hidden bg-[#0a0f1f] p-12 text-slate-100 lg:flex">
      <div className="orb orb-a" aria-hidden />
      <div className="orb orb-b" aria-hidden />
      <div className="orb orb-c" aria-hidden />
      <div className="login-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="hero-in relative flex items-center gap-3" style={d(0)}>
        <BrandMark className="h-9 w-9 text-indigo-400" />
        <div className="leading-tight">
          <p className="text-lg font-semibold tracking-tight">Cellutech</p>
          <p className="text-xs text-slate-400">Human Resource Management</p>
        </div>
      </div>

      <div className="relative mt-16 max-w-lg">
        <h2 className="hero-in text-4xl font-semibold leading-[1.15] tracking-tight" style={d(120)}>
          Every team, every leave request, one workspace.
        </h2>
        <p className="hero-in mt-4 max-w-md text-base text-slate-400" style={d(240)}>
          Manage employees, approvals and coverage across all Cellutech subsidiaries with live visibility for each role.
        </p>
      </div>

      <div className="relative mt-auto h-80 w-full max-w-xl">
        <div className="hero-in glass absolute left-0 top-10 w-80 p-5" style={d(380)}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Leave overview</p>
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300">Live</span>
          </div>
          <div className="mt-4 flex gap-8">
            <div>
              <p className="text-2xl font-semibold">38</p>
              <p className="text-xs text-slate-400">Approved</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">12</p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
          </div>
          <div className="mt-5 flex h-20 items-end gap-2">
            {BARS.map((h, i) => (
              <div
                key={i}
                className="bar flex-1 rounded-t-md bg-gradient-to-t from-indigo-500 to-cyan-400"
                style={{ height: h + "%", "--i": i } as CSSProperties}
              />
            ))}
          </div>
        </div>

        <div className="hero-in absolute right-0 top-0" style={d(560)}>
          <div className="glass float-a flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Leave approved</p>
              <p className="text-xs text-slate-400">Annual leave, 3 days</p>
            </div>
          </div>
        </div>

        <div className="hero-in absolute bottom-0 right-6" style={d(700)}>
          <div className="glass float-b flex items-center gap-3 px-4 py-3">
            <div className="flex -space-x-2">
              {AWAY.map((a) => (
                <span key={a} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0a0f1f] bg-indigo-500/80 text-[10px] font-semibold">
                  {a}
                </span>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium">4 away today</p>
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <CalendarCheck className="h-3 w-3" /> Coverage looks fine
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="relative mt-8 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" /> Encrypted sign-in with role-based access
      </p>
    </aside>
  );
}
`;
const heroPath = "src/components/login-hero.tsx";
fs.mkdirSync(path.dirname(file(heroPath)), { recursive: true });
fs.writeFileSync(file(heroPath), HERO);
console.log(`~ wrote    ${heroPath}`);

// ───────── 2. login page: replace the <main> block, keep the page's own logic ─────────
const loginPath = "src/app/login/page.tsx";
if (!fs.existsSync(file(loginPath))) { console.log(`! MISSING FILE ${loginPath}`); problems++; }
else {
  let s = fs.readFileSync(file(loginPath), "utf8");
  const mainRe = /<main[\s\S]*<\/main>/;
  const formRe = /<LoginForm[\s\S]*?\/>/;
  const block = s.match(mainRe)?.[0];
  const form = block?.match(formRe)?.[0];
  if (!block || !form) {
    console.log(`! could not find <main> or <LoginForm /> in ${loginPath} - send me this file`); problems++;
  } else {
    const hasToggle = fs.existsSync(file("src/components/theme-toggle.tsx"));
    const NEW = `<main className="relative grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <LoginHero />
      <section className="relative flex flex-col px-6 py-8 sm:px-12">
        ${hasToggle ? '<ThemeToggle className="absolute right-4 top-4" />' : ""}
        <div className="auth-enter m-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-9 w-9 text-indigo-500" />
            <p className="text-lg font-semibold tracking-tight">Cellutech HRMS</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use your work email and password to continue.</p>
          <div className="auth-form mt-8">
            ${form}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Trouble signing in? Contact your HR administrator.
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Cellutech. All rights reserved.</p>
      </section>
    </main>`;
    s = s.replace(mainRe, () => NEW);
    s = s.replace(/^import \{[^}]*\} from "@\/components\/login-hero";\n?/m, "");
    const imports = [...s.matchAll(/^import [\s\S]*?;$/gm)];
    const last = imports[imports.length - 1];
    let extra = '\nimport { LoginHero, BrandMark } from "@/components/login-hero";';
    if (hasToggle && !s.includes("theme-toggle")) extra += '\nimport { ThemeToggle } from "@/components/theme-toggle";';
    const at = last.index + last[0].length;
    s = s.slice(0, at) + extra + s.slice(at);
    fs.writeFileSync(file(loginPath), s);
    console.log(`~ patched  ${loginPath}${hasToggle ? "" : " (no theme-toggle found, skipped)"}`);
  }
}

// ───────── 3. CSS: replaces any earlier ui-polish block ─────────
const MARK = "/* ui-polish:start */";
const END = "/* ui-polish:end */";
const CSS = `
${MARK}
@keyframes page-in { from { opacity: 0; translate: 0 6px; } to { opacity: 1; translate: 0 0; } }
@keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes drift { to { transform: translate(70px, 50px) scale(1.18); } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
@keyframes bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }

main { animation: page-in 0.28s ease-out both; }

/* Login: hero panel */
.login-hero { animation: fade-in 0.6s ease-out both; }
.hero-in { animation: rise-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--d, 0ms); }
.auth-enter { animation: rise-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.orb { position: absolute; border-radius: 9999px; filter: blur(80px); opacity: 0.5; animation: drift 18s ease-in-out infinite alternate; pointer-events: none; }
.orb-a { width: 440px; height: 440px; background: #4f46e5; top: -140px; left: -120px; }
.orb-b { width: 380px; height: 380px; background: #0891b2; bottom: -120px; right: -100px; animation-duration: 23s; animation-delay: -7s; }
.orb-c { width: 300px; height: 300px; background: #7c3aed; top: 38%; left: 42%; opacity: 0.3; animation-duration: 27s; animation-delay: -12s; }
.login-grid {
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 0.04) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at 30% 25%, black, transparent 75%);
}
.glass {
  border-radius: 1rem;
  border: 1px solid rgb(255 255 255 / 0.1);
  background: rgb(255 255 255 / 0.06);
  backdrop-filter: blur(14px);
  box-shadow: 0 20px 40px -20px rgb(0 0 0 / 0.6);
}
.float-a { animation: float 6s ease-in-out infinite; }
.float-b { animation: float 7s ease-in-out -2.5s infinite; }
.bar { transform-origin: bottom; animation: bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(0.9s + var(--i, 0) * 90ms); }

/* Login: form polish (scoped so the rest of the app is untouched) */
.auth-form label { font-weight: 500; }
.auth-form input:not([type="checkbox"]) { height: 2.75rem; border-radius: 0.6rem; }
.auth-form input:focus-visible { outline: none; border-color: #6366f1; box-shadow: 0 0 0 4px rgb(99 102 241 / 0.15); }
.auth-form button[type="submit"] {
  width: 100%; height: 2.75rem; border-radius: 0.6rem; font-weight: 600; color: #fff;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  box-shadow: 0 8px 18px -8px rgb(79 70 229 / 0.7);
  transition: filter 0.15s ease, translate 0.15s ease, box-shadow 0.15s ease;
}
.auth-form button[type="submit"]:hover:not(:disabled) { filter: brightness(1.1); translate: 0 -1px; box-shadow: 0 12px 22px -8px rgb(79 70 229 / 0.8); }

/* App-wide interaction feedback */
a, button, input, select, textarea, [data-slot="card"], tbody tr {
  transition-property: color, background-color, border-color, box-shadow, opacity;
  transition-duration: 0.15s;
  transition-timing-function: ease;
}
button:not(:disabled):active { scale: 0.98; }
[data-slot="card"] { box-shadow: 0 1px 2px rgb(15 23 42 / 0.04); }
[data-slot="card"]:hover { border-color: color-mix(in oklab, var(--border), var(--foreground) 12%); }
tbody tr:hover { background-color: color-mix(in oklab, var(--muted), transparent 50%); }
:focus-visible { outline: 2px solid color-mix(in oklab, #6366f1, transparent 30%); outline-offset: 2px; }
body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
h1, h2, h3 { letter-spacing: -0.015em; }
::selection { background: rgb(99 102 241 / 0.25); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scale: none !important; }
}
${END}
`;
const cssPath = "src/app/globals.css";
if (!fs.existsSync(file(cssPath))) { console.log(`! MISSING FILE ${cssPath}`); problems++; }
else {
  let s = fs.readFileSync(file(cssPath), "utf8");
  const had = s.includes(MARK);
  s = s.replace(/\n?\/\* ui-polish:start \*\/[\s\S]*?\/\* ui-polish:end \*\/\n?/, "\n");
  fs.writeFileSync(file(cssPath), s.trimEnd() + "\n" + CSS);
  console.log(`~ ${had ? "updated" : "patched"}  ${cssPath}`);
}

console.log(problems ? `\nDone with ${problems} problem(s) - send me the lines starting with '!'.` : "\nAll done. Restart: npm run dev");