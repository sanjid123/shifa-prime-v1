// HR, Payroll, Staff & Credentials module. LocalStorage-persisted, Firebase-swappable later.
import type { Role } from "./data";
import { audit, notify } from "./data";

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
  username: string;
  mobile?: string;
  email?: string;
  joinedOn: string;
  active: boolean;
  // Extended profile (optional, back-compat)
  staffCode?: string;
  avatarUrl?: string;
  designation?: string;
  departmentId?: string;
  gender?: "M" | "F" | "Other";
  dob?: string;
  nationality?: string;
  language?: string;
  maritalStatus?: "Single" | "Married" | "Other";
  permanentAddress?: string;
  currentAddress?: string;
  bankAccount?: string;
  bankName?: string;
  accountHolder?: string;
  taxCode?: string;
  insuranceCode?: string;
  identifyCode?: string;
  hometown?: string;
  religion?: string;
}

export type AttendanceMark = "P" | "A" | "L" | "H"; // Present / Absent / Leave / Half-day
export interface AttendanceEntry {
  staffId: string;
  date: string;
  mark: AttendanceMark;
}

export interface SalaryStructure {
  staffId: string;
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  pf: boolean;
  esi: boolean;
}

export interface PayrollRun {
  id: string;
  staffId: string;
  month: string; // YYYY-MM
  daysWorked: number;
  daysInMonth: number;
  gross: number;
  deductions: number;
  net: number;
  paidOn?: string;
  mode?: "cash" | "upi" | "card" | "bank";
  note?: string;
}

export interface CredentialRecord {
  username: string;
  role: Role;
  password: string; // mock plaintext; firebase impl will hash
  mustChange: boolean;
  disabled: boolean;
  lastLoginAt?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PasswordResetRequest {
  id: string;
  username: string;
  requestedAt: string;
  status: "pending" | "resolved" | "rejected";
  resolvedAt?: string;
  tempPassword?: string;
}

/* ---------- seeds ---------- */
const nowISO = new Date().toISOString();

const initialStaff: StaffMember[] = [
  {
    id: "st-admin",
    name: "System Administrator",
    role: "admin",
    username: "admin",
    mobile: "9000000000",
    joinedOn: "2024-01-01",
    active: true,
  },
  {
    id: "st-acc",
    name: "Ravi Kumar",
    role: "accountant",
    username: "accountant",
    mobile: "9000000001",
    joinedOn: "2024-02-01",
    active: true,
  },
  {
    id: "st-fo",
    name: "Nisha Sharma",
    role: "front_office",
    username: "frontdesk",
    mobile: "9000000002",
    joinedOn: "2024-03-01",
    active: true,
  },
  {
    id: "st-fo2",
    name: "Reception Desk 2",
    role: "front_office",
    username: "reception",
    mobile: "9000000003",
    joinedOn: "2024-06-01",
    active: true,
  },
  {
    id: "st-doc",
    name: "Dr. Iqbal Ahmed",
    role: "doctor",
    username: "doctor",
    mobile: "9000000004",
    joinedOn: "2024-01-15",
    active: true,
  },
  {
    id: "st-lab",
    name: "Salma Beevi",
    role: "lab",
    username: "lab",
    mobile: "9000000005",
    joinedOn: "2024-04-01",
    active: true,
  },
  {
    id: "st-phm",
    name: "Anwar Ali",
    role: "pharmacy",
    username: "pharmacy",
    mobile: "9000000006",
    joinedOn: "2024-05-01",
    active: true,
  },
];

function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = "";
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const asciiBytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    asciiBytes.push(ascii.charCodeAt(i));
  }
  asciiBytes.push(0x80);
  while ((asciiBytes.length * 8) % 512 !== 448) {
    asciiBytes.push(0);
  }
  const bitsLow = ascii.length * 8 & 0xffffffff;
  const bitsHigh = (ascii.length * 8 - bitsLow) / maxWord;
  asciiBytes.push(
    (bitsHigh >>> 24) & 0xff, (bitsHigh >>> 16) & 0xff, (bitsHigh >>> 8) & 0xff, bitsHigh & 0xff,
    (bitsLow >>> 24) & 0xff, (bitsLow >>> 16) & 0xff, (bitsLow >>> 8) & 0xff, bitsLow & 0xff
  );
  for (let i = 0; i < asciiBytes.length; i += 64) {
    const w = new Array(64);
    for (let j = 0; j < 16; j++) {
      w[j] = (asciiBytes[i + j*4] << 24) | (asciiBytes[i + j*4 + 1] << 16) | (asciiBytes[i + j*4 + 2] << 8) | (asciiBytes[i + j*4 + 3]);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rightRotate(w[j-15], 7) ^ rightRotate(w[j-15], 18) ^ (w[j-15] >>> 3);
      const s1 = rightRotate(w[j-2], 17) ^ rightRotate(w[j-2], 19) ^ (w[j-2] >>> 10);
      w[j] = (w[j-16] + s0 + w[j-7] + s1) | 0;
    }
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
    for (let j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    hash[0] = (hash[0] + a) | 0; hash[1] = (hash[1] + b) | 0; hash[2] = (hash[2] + c) | 0; hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0; hash[5] = (hash[5] + f) | 0; hash[6] = (hash[6] + g) | 0; hash[7] = (hash[7] + h) | 0;
  }
  for (let i = 0; i < 8; i++) {
    const word = hash[i];
    result += ((word >>> 24) & 0xff).toString(16).padStart(2, '0') +
              ((word >>> 16) & 0xff).toString(16).padStart(2, '0') +
              ((word >>> 8) & 0xff).toString(16).padStart(2, '0') +
              (word & 0xff).toString(16).padStart(2, '0');
  }
  return result;
}

function isHashed(str: string): boolean {
  return /^[a-f0-9]{64}$/i.test(str);
}

const initialCreds: CredentialRecord[] = initialStaff.map((s) => ({
  username: s.username,
  role: s.role,
  // Universal demo password for every module - initially hashed.
  password: sha256("Root"),
  mustChange: false,
  disabled: false,
  updatedAt: nowISO,
  updatedBy: "system",
}));

const initialSalary: SalaryStructure[] = initialStaff.map((s) => ({
  staffId: s.id,
  basic:
    s.role === "doctor"
      ? 60000
      : s.role === "admin"
        ? 45000
        : s.role === "accountant"
          ? 35000
          : 22000,
  hra: 5000,
  allowances: 2000,
  deductions: 0,
  pf: true,
  esi: s.role !== "admin",
}));

export const staff: StaffMember[] = [...initialStaff];
export const credentials: CredentialRecord[] = [...initialCreds];
export const salaryStructures: SalaryStructure[] = [...initialSalary];
export const attendance: AttendanceEntry[] = [];
export const payrollRuns: PayrollRun[] = [];
export const passwordResetRequests: PasswordResetRequest[] = [];

/* ---------- persistence ---------- */
const KEY = "shifa.hr.v2";
function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        staff,
        credentials,
        salaryStructures,
        attendance,
        payrollRuns,
        passwordResetRequests,
      }),
    );
  } catch {
    /* quota */
  }
}
function hydrate() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      persist();
      return;
    }
    const p = JSON.parse(raw);
    const replace = <T>(target: T[], src: unknown) => {
      if (!Array.isArray(src)) return;
      target.length = 0;
      for (const x of src as T[]) target.push(x);
    };
    replace(staff, p.staff);
    replace(credentials, p.credentials);
    replace(salaryStructures, p.salaryStructures);
    replace(attendance, p.attendance);
    replace(payrollRuns, p.payrollRuns);
    replace(passwordResetRequests, p.passwordResetRequests);

    // Auto-migrate any unhashed legacy plain text passwords in hydrated credentials list
    let updated = false;
    for (const cred of credentials) {
      if (!isHashed(cred.password)) {
        cred.password = sha256(cred.password);
        updated = true;
      }
    }
    if (updated) {
      persist();
    }
  } catch {
    /* ignore */
  }
}
hydrate();

/* ---------- helpers ---------- */
export function verifyCredential(username: string, password: string): CredentialRecord | null {
  const u = username.trim().toLowerCase();
  const c = credentials.find((x) => x.username === u);
  if (!c || c.disabled) return null;

  let isMatch = false;
  if (isHashed(c.password)) {
    isMatch = (c.password === sha256(password));
  } else {
    // Migration fallback
    if (c.password === password) {
      c.password = sha256(password);
      persist();
      isMatch = true;
    }
  }

  if (!isMatch) return null;

  c.lastLoginAt = new Date().toISOString();
  persist();
  return c;
}

export function getCredential(username: string): CredentialRecord | undefined {
  return credentials.find((c) => c.username === username.trim().toLowerCase());
}

export function resetPassword(username: string, by: string, tempPassword?: string) {
  const c = getCredential(username);
  if (!c) throw new Error("User not found");
  const pw = tempPassword ?? Math.random().toString(36).slice(2, 10);
  c.password = sha256(pw);
  c.mustChange = true;
  c.updatedAt = new Date().toISOString();
  c.updatedBy = by;
  persist();
  audit("admin", "password_reset", { entity: "credential", entityId: c.username, meta: { by } });
  return pw;
}

export function changePassword(username: string, newPassword: string) {
  const c = getCredential(username);
  if (!c) throw new Error("User not found");
  c.password = sha256(newPassword);
  c.mustChange = false;
  c.updatedAt = new Date().toISOString();
  persist();
  audit("auth", "password_changed", { entity: "credential", entityId: c.username });
}

export function toggleDisabled(username: string, by: string) {
  const c = getCredential(username);
  if (!c) return;
  c.disabled = !c.disabled;
  c.updatedAt = new Date().toISOString();
  c.updatedBy = by;
  persist();
  audit("admin", c.disabled ? "user_disabled" : "user_enabled", {
    entity: "credential",
    entityId: c.username,
    meta: { by },
  });
}

export function requestPasswordReset(username: string) {
  const u = username.trim().toLowerCase();
  if (!getCredential(u)) throw new Error("Unknown user");
  const req: PasswordResetRequest = {
    id: `pr${Date.now()}`,
    username: u,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };
  passwordResetRequests.unshift(req);
  persist();
  notify("info", `Password reset requested by ${u}`, {
    username: u,
    kind: "password_reset_request",
  });
  return req;
}

export function resolvePasswordReset(id: string, by: string) {
  const r = passwordResetRequests.find((x) => x.id === id);
  if (!r) return;
  const temp = resetPassword(r.username, by);
  r.status = "resolved";
  r.resolvedAt = new Date().toISOString();
  r.tempPassword = temp;
  persist();
  return temp;
}

/* Staff CRUD */
export function addStaff(s: Omit<StaffMember, "id"> & { password?: string }) {
  const id = `st${Date.now()}`;
  const staffCode = s.staffCode ?? `SC${Math.floor(10000 + Math.random() * 89999)}`;
  const rec: StaffMember = { ...s, id, staffCode, username: s.username.trim().toLowerCase() };
  staff.unshift(rec);
  if (!getCredential(rec.username)) {
    credentials.push({
      username: rec.username,
      role: rec.role,
      password: s.password ?? `${rec.username}123`,
      mustChange: !s.password,
      disabled: false,
      updatedAt: new Date().toISOString(),
      updatedBy: "admin",
    });
  }
  salaryStructures.push({
    staffId: id,
    basic: 20000,
    hra: 4000,
    allowances: 1000,
    deductions: 0,
    pf: true,
    esi: true,
  });
  persist();
  audit("admin", "staff_add", {
    entity: "staff",
    entityId: id,
    meta: { name: rec.name, role: rec.role, departmentId: rec.departmentId },
  });
  return rec;
}

export function updateStaff(id: string, patch: Partial<StaffMember>) {
  const s = staff.find((x) => x.id === id);
  if (!s) return;
  Object.assign(s, patch);
  persist();
  audit("admin", "staff_update", { entity: "staff", entityId: id, meta: patch });
}

export function removeStaff(id: string) {
  const idx = staff.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const [s] = staff.splice(idx, 1);
  const ci = credentials.findIndex((c) => c.username === s.username);
  if (ci !== -1) credentials.splice(ci, 1);
  persist();
  audit("admin", "staff_remove", { entity: "staff", entityId: id, meta: { name: s.name } });
}

/* Attendance */
export function markAttendance(staffId: string, date: string, mark: AttendanceMark) {
  const existing = attendance.find((a) => a.staffId === staffId && a.date === date);
  if (existing) existing.mark = mark;
  else attendance.push({ staffId, date, mark });
  persist();
}

export function attendanceFor(staffId: string, monthISO: string): AttendanceEntry[] {
  return attendance.filter((a) => a.staffId === staffId && a.date.startsWith(monthISO));
}

export function daysWorked(staffId: string, monthISO: string): number {
  return attendanceFor(staffId, monthISO).reduce(
    (s, a) => s + (a.mark === "P" ? 1 : a.mark === "H" ? 0.5 : 0),
    0,
  );
}

/* Salary */
export function getSalary(staffId: string): SalaryStructure {
  return (
    salaryStructures.find((x) => x.staffId === staffId) ?? {
      staffId,
      basic: 0,
      hra: 0,
      allowances: 0,
      deductions: 0,
      pf: false,
      esi: false,
    }
  );
}
export function saveSalary(patch: SalaryStructure) {
  const idx = salaryStructures.findIndex((x) => x.staffId === patch.staffId);
  if (idx === -1) salaryStructures.push(patch);
  else salaryStructures[idx] = patch;
  persist();
  audit("admin", "salary_update", { entity: "salary", entityId: patch.staffId });
}

/* Payroll */
export function runPayroll(staffId: string, monthISO: string, daysInMonth = 30): PayrollRun {
  const sal = getSalary(staffId);
  const worked = daysWorked(staffId, monthISO);
  const gross = Math.round(((sal.basic + sal.hra + sal.allowances) * worked) / daysInMonth);
  const pfAmt = sal.pf ? Math.round(sal.basic * 0.12) : 0;
  const esiAmt = sal.esi ? Math.round(gross * 0.0075) : 0;
  const deductions = sal.deductions + pfAmt + esiAmt;
  const net = Math.max(0, gross - deductions);
  const run: PayrollRun = {
    id: `pay${Date.now()}-${staffId}`,
    staffId,
    month: monthISO,
    daysWorked: worked,
    daysInMonth,
    gross,
    deductions,
    net,
  };
  payrollRuns.unshift(run);
  persist();
  audit("admin", "payroll_run", {
    entity: "payroll",
    entityId: run.id,
    meta: { staffId, monthISO, net },
  });
  return run;
}

export function markPayrollPaid(id: string, mode: PayrollRun["mode"]) {
  const r = payrollRuns.find((x) => x.id === id);
  if (!r) return;
  r.paidOn = new Date().toISOString();
  r.mode = mode;
  persist();
  audit("admin", "payroll_paid", { entity: "payroll", entityId: id, meta: { mode } });
}

export function payrollFor(staffId: string): PayrollRun[] {
  return payrollRuns.filter((p) => p.staffId === staffId);
}

export function payrollYTD(staffId: string, year: number) {
  const runs = payrollFor(staffId).filter((r) => r.month.startsWith(String(year)));
  const paid = runs.filter((r) => r.paidOn);
  return {
    runs: runs.length,
    totalPaid: paid.reduce((s, r) => s + r.net, 0),
    pending: runs.filter((r) => !r.paidOn).reduce((s, r) => s + r.net, 0),
    daysWorked: runs.reduce((s, r) => s + r.daysWorked, 0),
  };
}
