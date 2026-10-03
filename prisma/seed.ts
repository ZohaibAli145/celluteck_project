import { PrismaClient, type LeaveType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Password@123";
const YEAR = new Date().getFullYear();

// ───────────── helpers ─────────────

let seedState = 42;
function rand(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}

function dayOffset(offset: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

function workdayFrom(offset: number, weekend: number[]): Date {
  const d = dayOffset(offset);
  while (weekend.includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function countWorkingDays(start: Date, end: Date, weekend: number[]): number {
  let n = 0;
  const d = new Date(start);
  while (d <= end) {
    if (!weekend.includes(d.getUTCDay())) n++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return n;
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);

// ───────────── static config ─────────────

const COUNTRIES = [
  { name: "United Arab Emirates", code: "AE" },
  { name: "Pakistan", code: "PK" },
];

const DEPARTMENTS = [
  { code: "HR", name: "Human Resources", designations: ["HR Manager", "HR Executive"] },
  { code: "ENG", name: "Engineering", designations: ["Head of Engineering", "Engineering Team Lead", "Software Engineer"] },
  { code: "SAL", name: "Sales", designations: ["Head of Sales", "Sales Team Lead", "Sales Executive"] },
];

const ROLES = [
  { name: "SUPER_ADMIN", label: "Super Admin", permissions: ["*"] },
  { name: "HR_MANAGER", label: "Subsidiary HR Manager", permissions: ["employees.manage", "departments.manage", "holidays.manage", "leave.override", "dashboard.subsidiary", "announcements.post"] },
  { name: "DEPT_HEAD", label: "Department Head", permissions: ["leave.approve.l1", "leave.approve.l2", "dashboard.team", "dashboard.department"] },
  { name: "TEAM_LEAD", label: "Team Lead", permissions: ["leave.approve.l1", "dashboard.team"] },
  { name: "EMPLOYEE", label: "Employee", permissions: ["leave.apply", "profile.edit"] },
];

const LEAVE_TYPES = [
  { name: "Annual Leave", quota: 20, escalate: false, paid: true },
  { name: "Sick Leave", quota: 10, escalate: false, paid: true },
  { name: "Casual Leave", quota: 8, escalate: false, paid: true },
  { name: "Unpaid Leave", quota: 30, escalate: true, paid: false },
  { name: "Maternity / Paternity Leave", quota: 30, escalate: true, paid: true },
  { name: "Bereavement Leave", quota: 5, escalate: false, paid: true },
  { name: "Work From Home", quota: 24, escalate: false, paid: true },
];

interface TeamNames {
  head: string;
  lead: string;
  emps: [string, string];
}
interface SubConfig {
  key: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
  weekendDays: number[];
  holidays: [string, number, number][]; // name, month, day
  hr: string;
  ENG: TeamNames;
  SAL: TeamNames;
}

const PK_HOLIDAYS: [string, number, number][] = [
  ["Kashmir Solidarity Day", 2, 5],
  ["Pakistan Day", 3, 23],
  ["Labour Day", 5, 1],
  ["Independence Day", 8, 14],
  ["Iqbal Day", 11, 9],
  ["Quaid-e-Azam Day", 12, 25],
];

const SUBSIDIARIES: SubConfig[] = [
  {
    key: "dubai", name: "Cellutech Dubai", city: "Dubai", country: "AE",
    timezone: "Asia/Dubai", currency: "AED", weekendDays: [0, 6],
    holidays: [["New Year's Day", 1, 1], ["Commemoration Day", 12, 1], ["UAE National Day", 12, 2]],
    hr: "Sara Al Mansoori",
    ENG: { head: "Omar Haddad", lead: "Rami Khalil", emps: ["Yusuf Karim", "Hana Said"] },
    SAL: { head: "Layla Nasser", lead: "Noor Fadel", emps: ["Tariq Aziz", "Mariam Odeh"] },
  },
  {
    key: "karachi", name: "Cellutech Karachi", city: "Karachi", country: "PK",
    timezone: "Asia/Karachi", currency: "PKR", weekendDays: [0, 6],
    holidays: PK_HOLIDAYS,
    hr: "Ayesha Siddiqui",
    ENG: { head: "Bilal Ahmed", lead: "Hamza Sheikh", emps: ["Zainab Raza", "Fahad Memon"] },
    SAL: { head: "Sana Qureshi", lead: "Imran Baig", emps: ["Hira Javed", "Danish Ali"] },
  },
  {
    key: "lahore", name: "Cellutech Lahore", city: "Lahore", country: "PK",
    timezone: "Asia/Karachi", currency: "PKR", weekendDays: [0, 6],
    holidays: PK_HOLIDAYS,
    hr: "Maryam Chaudhry",
    ENG: { head: "Usman Malik", lead: "Kamran Butt", emps: ["Areeba Khan", "Talha Mehmood"] },
    SAL: { head: "Nida Hassan", lead: "Faisal Rauf", emps: ["Rabia Anwar", "Saad Iqbal"] },
  },
];

// ───────────── main ─────────────

async function main() {
  console.log("Resetting database...");
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveApprovalStep.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.user.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.department.deleteMany();
  await prisma.subsidiary.deleteMany();
  await prisma.country.deleteMany();
  await prisma.role.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await prisma.company.create({
    data: { name: "Cellutech FZCO", headquarters: "Dubai Airport Freezone, UAE" },
  });

  const roleId: Record<string, string> = {};
  for (const r of ROLES) {
    const row = await prisma.role.create({
      data: { name: r.name, label: r.label, permissions: JSON.stringify(r.permissions) },
    });
    roleId[r.name] = row.id;
  }

  const countryId: Record<string, string> = {};
  for (const c of COUNTRIES) {
    const row = await prisma.country.create({ data: c });
    countryId[c.code] = row.id;
  }

  let empCounter = 1;
  async function makeUser(p: {
    name: string;
    email: string;
    role: string;
    subsidiaryId?: string;
    departmentId?: string;
    designationId?: string;
    managerId?: string | null;
    joinedDaysAgo: number;
  }) {
    return prisma.user.create({
      data: {
        employeeCode: `CT-${String(empCounter++).padStart(4, "0")}`,
        name: p.name,
        email: p.email,
        passwordHash,
        phone: `+971 5${Math.floor(10000000 + rand() * 89999999)}`,
        roleId: roleId[p.role],
        subsidiaryId: p.subsidiaryId ?? null,
        departmentId: p.departmentId ?? null,
        designationId: p.designationId ?? null,
        managerId: p.managerId ?? null,
        joiningDate: dayOffset(-p.joinedDaysAgo),
        status: "ACTIVE",
      },
    });
  }
  type U = Awaited<ReturnType<typeof makeUser>>;

  // Top of the chain
  const admin = await makeUser({
    name: "Ahmed Raza",
    email: "admin@cellutech.com",
    role: "SUPER_ADMIN",
    joinedDaysAgo: 1800,
  });

  // Track per-subsidiary data for later steps
  const used = new Map<string, number>(); // `${userId}:${leaveTypeId}` -> used days
  const notifications: { userId: string; message: string; link: string; isRead: boolean }[] = [];
  const allStaff: { user: U; subId: string; weekend: number[]; typeByName: Record<string, LeaveType> }[] = [];

  for (const cfg of SUBSIDIARIES) {
    console.log(`Seeding ${cfg.name}...`);

    const sub = await prisma.subsidiary.create({
      data: {
        name: cfg.name,
        city: cfg.city,
        countryId: countryId[cfg.country],
        timezone: cfg.timezone,
        currency: cfg.currency,
        weekendDays: cfg.weekendDays.join(","),
      },
    });

    await prisma.holiday.createMany({
      data: cfg.holidays.map(([name, m, d]) => ({
        subsidiaryId: sub.id,
        name,
        date: new Date(Date.UTC(YEAR, m - 1, d)),
      })),
    });

    const typeByName: Record<string, LeaveType> = {};
    for (const t of LEAVE_TYPES) {
      typeByName[t.name] = await prisma.leaveType.create({
        data: {
          name: t.name,
          subsidiaryId: sub.id,
          defaultAnnualQuota: t.quota,
          requiresEscalation: t.escalate,
          escalationThresholdDays: 3,
          isPaid: t.paid,
        },
      });
    }

    // Departments + designations
    const dept: Record<string, string> = {};
    const desig: Record<string, string> = {};
    for (const d of DEPARTMENTS) {
      const row = await prisma.department.create({ data: { name: d.name, subsidiaryId: sub.id } });
      dept[d.code] = row.id;
      for (const title of d.designations) {
        const dg = await prisma.designation.create({ data: { name: title, departmentId: row.id } });
        desig[title] = dg.id;
      }
    }

    const base = { subsidiaryId: sub.id };
    const k = cfg.key;

    // HR manager reports to Super Admin
    const hr = await makeUser({
      ...base, name: cfg.hr, email: `hr.${k}@cellutech.com`, role: "HR_MANAGER",
      departmentId: dept.HR, designationId: desig["HR Manager"], managerId: admin.id, joinedDaysAgo: 1200,
    });

    const staff: U[] = [hr];

    // The Super Admin sits at HQ (Dubai) so they get a leave policy, balances and attendance
    if (cfg.key === "dubai") {
      await prisma.user.update({ where: { id: admin.id }, data: { subsidiaryId: sub.id } });
      staff.push(admin);
    }

    const teams: Record<"ENG" | "SAL", { head: U; lead: U; emps: U[] }> = {} as never;
    for (const code of ["ENG", "SAL"] as const) {
      const names = cfg[code];
      const c = code.toLowerCase();
      const titles = DEPARTMENTS.find((d) => d.code === code)!.designations;

      const head = await makeUser({
        ...base, name: names.head, email: `head.${c}.${k}@cellutech.com`, role: "DEPT_HEAD",
        departmentId: dept[code], designationId: desig[titles[0]], managerId: admin.id, joinedDaysAgo: 1000,
      });
      const lead = await makeUser({
        ...base, name: names.lead, email: `lead.${c}.${k}@cellutech.com`, role: "TEAM_LEAD",
        departmentId: dept[code], designationId: desig[titles[1]], managerId: head.id, joinedDaysAgo: 700,
      });
      const emps: U[] = [];
      for (let i = 0; i < names.emps.length; i++) {
        emps.push(
          await makeUser({
            ...base, name: names.emps[i], email: `emp${i + 1}.${c}.${k}@cellutech.com`, role: "EMPLOYEE",
            departmentId: dept[code], designationId: desig[titles[2]], managerId: lead.id,
            joinedDaysAgo: 200 + Math.floor(rand() * 400),
          }),
        );
      }
      teams[code] = { head, lead, emps };
      staff.push(head, lead, ...emps);
    }

    // ───── leave requests (cover every state of the workflow) ─────
    async function createLeave(a: {
      user: U;
      typeName: string;
      startOffset: number;
      span: number; // calendar days
      reason: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      escalation: boolean;
      steps: { approver: U; level: number; decision: "PENDING" | "APPROVED" | "REJECTED"; comment?: string }[];
    }) {
      const type = typeByName[a.typeName];
      const start = workdayFrom(a.startOffset, cfg.weekendDays);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + a.span - 1);
      const totalDays = countWorkingDays(start, end, cfg.weekendDays);
      const firstPending = a.steps.find((s) => s.decision === "PENDING");
      const current = firstPending ? firstPending.level : a.steps[a.steps.length - 1].level;

      await prisma.leaveRequest.create({
        data: {
          userId: a.user.id,
          leaveTypeId: type.id,
          startDate: start,
          endDate: end,
          totalDays,
          reason: a.reason,
          status: a.status,
          currentApprovalStep: current,
          requiresEscalation: a.escalation,
          steps: {
            create: a.steps.map((s) => ({
              approverId: s.approver.id,
              level: s.level,
              decision: s.decision,
              comment: s.comment ?? null,
              decidedAt: s.decision === "PENDING" ? null : dayOffset(a.startOffset - 3),
            })),
          },
        },
      });

      if (a.status === "APPROVED") {
        const key = `${a.user.id}:${type.id}`;
        used.set(key, (used.get(key) ?? 0) + totalDays);
      }

      if (a.status === "PENDING" && firstPending) {
        notifications.push({
          userId: firstPending.approver.id,
          message: `${a.user.name} requested ${a.typeName} (${fmt(start)} → ${fmt(end)}) — your approval is needed.`,
          link: "/approvals",
          isRead: false,
        });
      } else {
        notifications.push({
          userId: a.user.id,
          message: `Your ${a.typeName} request (${fmt(start)} → ${fmt(end)}) was ${a.status.toLowerCase()}.`,
          link: "/leave",
          isRead: a.status === "APPROVED",
        });
      }
    }

    const { ENG, SAL } = teams;

    // 1. Past, fully approved (single level)
    await createLeave({
      user: ENG.emps[0], typeName: "Casual Leave", startOffset: -12, span: 2, reason: "Family function",
      status: "APPROVED", escalation: false,
      steps: [{ approver: ENG.lead, level: 1, decision: "APPROVED", comment: "Approved, enjoy." }],
    });
    // 2. Long leave, waiting at level 1 (will escalate afterwards)
    await createLeave({
      user: ENG.emps[1], typeName: "Annual Leave", startOffset: 10, span: 7, reason: "Annual vacation",
      status: "PENDING", escalation: true,
      steps: [
        { approver: ENG.lead, level: 1, decision: "PENDING" },
        { approver: ENG.head, level: 2, decision: "PENDING" },
      ],
    });
    // 3. Long leave, level 1 approved, waiting at department head
    await createLeave({
      user: SAL.emps[0], typeName: "Annual Leave", startOffset: 14, span: 7, reason: "Travelling abroad",
      status: "PENDING", escalation: true,
      steps: [
        { approver: SAL.lead, level: 1, decision: "APPROVED", comment: "OK from my side." },
        { approver: SAL.head, level: 2, decision: "PENDING" },
      ],
    });
    // 4. Short sick leave pending at level 1 only
    await createLeave({
      user: SAL.emps[1], typeName: "Sick Leave", startOffset: 2, span: 1, reason: "Fever",
      status: "PENDING", escalation: false,
      steps: [{ approver: SAL.lead, level: 1, decision: "PENDING" }],
    });
    // 5. Team lead's own leave — manager IS the dept head, so only one level
    await createLeave({
      user: ENG.lead, typeName: "Annual Leave", startOffset: 20, span: 6, reason: "Personal trip",
      status: "PENDING", escalation: false,
      steps: [{ approver: ENG.head, level: 1, decision: "PENDING" }],
    });
    // 6. Rejected request
    await createLeave({
      user: SAL.emps[0], typeName: "Casual Leave", startOffset: -5, span: 1, reason: "Personal errand",
      status: "REJECTED", escalation: false,
      steps: [{ approver: SAL.lead, level: 1, decision: "REJECTED", comment: "Month-end closing, please reschedule." }],
    });
    // 7. Escalated and fully approved at both levels
    await createLeave({
      user: ENG.emps[0], typeName: "Unpaid Leave", startOffset: -30, span: 5, reason: "Higher studies exam",
      status: "APPROVED", escalation: true,
      steps: [
        { approver: ENG.lead, level: 1, decision: "APPROVED" },
        { approver: ENG.head, level: 2, decision: "APPROVED", comment: "Approved." },
      ],
    });

    // ───── attendance: last 14 days of working days ─────
    const attendanceRows: {
      userId: string; date: Date; status: string; checkIn: Date | null; checkOut: Date | null;
    }[] = [];
    for (let off = -14; off <= 0; off++) {
      const date = dayOffset(off);
      if (cfg.weekendDays.includes(date.getUTCDay())) continue;
      for (const u of staff) {
        const r = rand();
        const status = r < 0.8 ? "PRESENT" : r < 0.88 ? "LATE" : r < 0.93 ? "WFH" : r < 0.97 ? "ABSENT" : "ON_LEAVE";
        const present = status === "PRESENT" || status === "LATE" || status === "WFH";
        const inH = status === "LATE" ? 10 : 9;
        attendanceRows.push({
          userId: u.id,
          date,
          status,
          checkIn: present ? new Date(date.getTime() + inH * 3600_000) : null,
          checkOut: present ? new Date(date.getTime() + 18 * 3600_000) : null,
        });
      }
    }
    await prisma.attendance.createMany({ data: attendanceRows });

    // ───── subsidiary announcement ─────
    await prisma.announcement.create({
      data: {
        title: `${cfg.city} office update`,
        body: `Reminder from HR: please review the upcoming holiday calendar for ${cfg.name} and plan your leave early.`,
        scope: "SUBSIDIARY",
        subsidiaryId: sub.id,
        createdById: hr.id,
      },
    });

    for (const u of staff) allStaff.push({ user: u, subId: sub.id, weekend: cfg.weekendDays, typeByName });
  }

  // ───── leave balances (after approved requests are known) ─────
  const balanceRows: { userId: string; leaveTypeId: string; year: number; allotted: number; used: number }[] = [];
  for (const s of allStaff) {
    for (const t of LEAVE_TYPES) {
      const type = s.typeByName[t.name];
      balanceRows.push({
        userId: s.user.id,
        leaveTypeId: type.id,
        year: YEAR,
        allotted: t.quota,
        used: used.get(`${s.user.id}:${type.id}`) ?? 0,
      });
    }
  }
  await prisma.leaveBalance.createMany({ data: balanceRows });

  await prisma.notification.createMany({ data: notifications });

  await prisma.announcement.create({
    data: {
      title: "Welcome to the Cellutech HRMS",
      body: "Apply for leave, track approvals and explore the organization chart from one place.",
      scope: "GLOBAL",
      createdById: admin.id,
    },
  });
  await prisma.announcement.create({
    data: {
      title: "Q4 All-Hands (Global)",
      body: "All subsidiaries join the quarterly all-hands next month. Calendar invite to follow.",
      scope: "GLOBAL",
      createdById: admin.id,
    },
  });

  console.log("\n✅ Seed complete. Demo logins (password for all: " + PASSWORD + ")");
  console.log("  Super Admin : admin@cellutech.com");
  console.log("  HR Manager  : hr.dubai@cellutech.com");
  console.log("  Dept Head   : head.eng.dubai@cellutech.com");
  console.log("  Team Lead   : lead.eng.dubai@cellutech.com");
  console.log("  Employee    : emp1.eng.dubai@cellutech.com");
  console.log("  (same pattern for .karachi and .lahore)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());