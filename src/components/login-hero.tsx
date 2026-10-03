import type { CSSProperties } from "react";
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
