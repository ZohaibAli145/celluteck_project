# Cellutech HRMS

A multi-subsidiary HR Management System built for the Cellutech FZCO technical assessment, following the provided SRS. Employees apply for leave, requests route through a reporting-hierarchy-based approval chain (line manager → department head when escalated), and every role gets a dashboard driven by live database data.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Database | SQLite (switchable to MySQL, see below) |
| ORM | Prisma 6 |
| Auth | Custom JWT session cookie (`jose`) + `bcryptjs` password hashing |
| Validation | Zod (server-side on every action) |

## Quick start

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
# open .env and set AUTH_SECRET to any long random string
npx prisma migrate dev        # creates the SQLite database + generates the client
npx prisma db seed            # loads demo data
npm run dev                   # http://localhost:3000
```

Re-running `npx prisma db seed` resets the demo data to its initial state.

### Using MySQL instead
In `prisma/schema.prisma` change `provider = "sqlite"` to `"mysql"`, set `DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/hrms"` in `.env`, then run the same migrate + seed commands. No other code change is needed (enum-like fields are plain strings on purpose).

## Demo accounts

Password for **all** accounts: `Password@123`

| Role | Email |
|---|---|
| Super Admin | admin@cellutech.com |
| HR Manager (Dubai) | hr.dubai@cellutech.com |
| Department Head (Engineering, Dubai) | head.eng.dubai@cellutech.com |
| Team Lead (Engineering, Dubai) | lead.eng.dubai@cellutech.com |
| Employee (Engineering, Dubai) | emp1.eng.dubai@cellutech.com |

Same pattern for other subsidiaries and departments: `hr.karachi@…`, `head.sal.lahore@…`, `emp2.sal.karachi@…` (departments: `eng`, `sal`; subsidiaries: `dubai`, `karachi`, `lahore`). The login page also has one-click demo buttons.

### Suggested walkthrough (leave approval hierarchy)
1. Log in as `emp2.eng.dubai@cellutech.com` → **My Leave**: a 7-day Annual Leave is pending, with a 2-level trail (Line manager → Department Head).
2. Log in as `lead.eng.dubai@cellutech.com` → **Approvals** → Approve (Level 1). The employee is notified and the request moves to Level 2.
3. Log in as `head.eng.dubai@cellutech.com` → **Approvals** → Approve (Level 2). Balance is deducted, employee is notified.
4. Log in as `hr.dubai@cellutech.com` → **Approvals** shows "Other pending requests" with override (comment required).
5. Apply for a new leave longer than 3 working days as any employee to see escalation being created.

## What is in the app

| Route | Who | What |
|---|---|---|
| `/login` | everyone | Email/password login |
| `/dashboard` | all roles | Role-specific dashboard (see below) |
| `/leave` | all roles | Balances, apply form with live working-day preview, history with approval trail, cancel |
| `/approvals` | managers, HR, admin | Queue of requests waiting for you, approve/reject with comments, HR/Admin override |
| `/org-chart` | all roles | Collapsible reporting tree; Super Admin gets a global view + per-subsidiary filter |
| `/notifications` | all roles | Leave status changes and pending approvals |

**Dashboards (all numbers come from the database):**
- Super Admin: global headcount, subsidiary comparison, headcount by country, attendance rate per subsidiary, pending leave across subsidiaries
- HR Manager: headcount by department, leave utilization, attendance breakdown, on-leave-today, upcoming holidays
- Department Head / Team Lead: approvals queue, team attendance, who is away in the next 30 days, own balances
- Employee: balance breakdown, request status, holidays, announcements

## Architecture and key decisions

- **Hierarchy:** `User.managerId` is a self-reference. `lib/hierarchy.ts` computes the full manager chain (used for escalation) and all direct + indirect reports (used for team dashboards). Cycle-safe.
- **Approval chain:** created at submission as `LeaveApprovalStep` rows. Level 1 = direct manager. Level 2 = nearest Department Head above level 1, only when the leave type is flagged for escalation or the leave is longer than the threshold (default 3 working days). Every decision stores approver, timestamp and comment (audit trail).
- **Working days:** weekends (configurable per subsidiary) and the subsidiary's public holidays are excluded.
- **Security:** route guard in `src/proxy.ts` (Next.js 16 name for middleware), and RBAC enforced again on the server in every page and server action (`lib/auth.ts`). Hiding UI is never the only protection. Decisions are claimed atomically so two approvers cannot decide the same step twice.
- **Single source of truth for roles:** `lib/permissions.ts` drives the route guard, sidebar and checks.
- **Server Components** fetch data; only charts and interactive forms are client components.

## Assumptions (where the SRS was open)

- Deadline: the email mentions both 24 and 48 hours; I treated **24 hours** as binding.
- The Super Admin belongs to the Dubai HQ subsidiary for leave-policy purposes (so they can apply for leave, as the permission matrix says), but keeps global scope through the role.
- If a person's direct manager is already a Department Head (e.g. a Team Lead's own leave), only one approval level is created (no double approval by the same person).
- A person with no manager (top of the tree) gets their leave auto-approved.
- If no Department Head exists above Level 1, Level 1 is final.
- Pending requests reserve balance, so a user cannot over-book while requests are in flight.
- Balance is deducted from the year in which the leave starts. Back-dated requests are allowed; overlapping requests are not.
- HR Manager (own subsidiary) and Super Admin can override a pending decision; a comment is mandatory, the override is final and is marked `[Override by …]` in the trail.
- Leave types and quotas are per subsidiary (seeded identically for the demo).
- Attendance data is simulated by the seed for the last 14 days; the dashboards compute rates from it.
- Custom JWT auth was chosen over Auth.js (the SRS allows an equivalent JWT solution) to avoid beta-version risk.

## Completed vs deferred

**Completed (SRS section 9.1 mandatory):**
- Authentication with 5 roles, RBAC in route guard + server
- Org model: 2 countries, 3 subsidiaries, departments, designations, 28 seeded employees with a 4-level reporting chain
- Leave management end-to-end with multi-level approval, escalation, audit trail, balances, cancel, override
- 4 role-based, database-driven dashboards with charts
- Organization chart
- From "should include": holidays per subsidiary (seeded, used in leave calculation and shown on dashboards), in-app notifications for leave events, announcements (global + subsidiary, displayed on dashboards), attendance data feeding dashboards

**Deferred (schema supports them, UI not built):**
- Employee directory/profile screens and employee create/deactivate flows
- Department / subsidiary / holiday management screens
- Leave calendar view (a "who is away" list is on the team dashboard)
- Attendance check-in/out UI (data model + dashboard analytics exist)
- Posting announcements from the UI
- Document upload, CSV/PDF exports, Finance/Payroll role
- Automated tests

## How the schema extends to future modules

- **Payroll:** `PayrollRun` and `Payslip` tables keyed by `userId` + period; approved `LeaveRequest` (with `leaveType.isPaid`) and `Attendance` already provide the inputs; a Finance role is a new `Role` row.
- **Recruitment (ATS):** `JobOpening` (department, designation), `Candidate`, `Application` with stages; hiring creates a `User` through the existing onboarding path.
- **Performance:** `ReviewCycle`, `Review` (reviewer = `managerId`, so the existing hierarchy decides who reviews whom).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` / `npm start` | Production build / run |
| `npx prisma migrate dev` | Apply migrations |
| `npx prisma db seed` | Reset + load demo data |
| `npx prisma studio` | Browse the database |