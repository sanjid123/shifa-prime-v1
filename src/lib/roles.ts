import type { Role } from "./mock/data";

export const ROLE_LABEL: Record<Role, string> = {
  front_office: "Front Office",
  lab: "Laboratory",
  pharmacy: "Pharmacy",
  admin: "Administrator",
  accountant: "Accountant",
  doctor: "Doctor EMR",
};

export const ROLE_HOME: Record<Role, string> = {
  front_office: "/app/front-office",
  lab: "/app/lab",
  pharmacy: "/app/pharmacy",
  admin: "/app/admin",
  accountant: "/app/admin",
  doctor: "/app/doctor",
};

/**
 * DEMO_UNLOCK_DOCTOR - production default is `false` so the Doctor EMR
 * is only visible to `doctor` (and `admin` for support). Flip to `true`
 * for internal demos where every role should be able to explore the module.
 */
export const DEMO_UNLOCK_DOCTOR = false;

const DOCTOR_ROLES: Role[] = DEMO_UNLOCK_DOCTOR
  ? ["doctor", "front_office", "lab", "pharmacy", "admin", "accountant"]
  : ["doctor", "admin"];


// Which roles may open a given URL prefix. Both super users share the admin surface;
// role-level UI hides write actions from the accountant.
export const ROUTE_ROLE: { prefix: string; roles: Role[] }[] = [
  { prefix: "/app/front-office", roles: ["front_office", "admin", "accountant"] },
  { prefix: "/app/lab", roles: ["lab", "admin", "accountant"] },
  { prefix: "/app/pharmacy", roles: ["pharmacy", "admin", "accountant"] },
  { prefix: "/app/admin", roles: ["admin", "accountant"] },
  { prefix: "/app/hr", roles: ["admin", "accountant"] },
  { prefix: "/app/doctor", roles: DOCTOR_ROLES },
];

/** Capability matrix - enforce in UI to hide/disable buttons per role. */
export type Capability =
  | "patient.register"
  | "patient.edit"
  | "patient.delete"
  | "visit.create"
  | "fee.collect"
  | "receipt.print"
  | "lab.editReport"
  | "pharmacy.editBill"
  | "accounts.access";

const CAPS: Record<Role, Capability[]> = {
  front_office: ["patient.register", "patient.edit", "visit.create", "fee.collect", "receipt.print"],
  doctor: ["patient.edit", "visit.create"],
  lab: ["patient.register", "lab.editReport"],
  pharmacy: ["patient.register", "pharmacy.editBill"],
  admin: [
    "patient.register", "patient.edit", "patient.delete", "visit.create",
    "fee.collect", "receipt.print", "lab.editReport", "pharmacy.editBill", "accounts.access",
  ],
  accountant: ["accounts.access"],
};

export function can(cap: Capability): boolean {
  const r = getRole();
  if (!r) return false;
  return CAPS[r]?.includes(cap) ?? false;
}


// Mock username -> role mapping (password ignored).
export const USERNAME_ROLE: Record<string, Role> = {
  frontdesk: "front_office",
  reception: "front_office",
  lab: "lab",
  pharmacy: "pharmacy",
  admin: "admin",
  accountant: "accountant",
  doctor: "doctor",
};

export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem("shifa.role") as Role) || null;
}
export function setRole(r: Role) {
  localStorage.setItem("shifa.role", r);
}
export function clearRole() {
  localStorage.removeItem("shifa.role");
}

/** Administrator = super user with write access; Accountant = read-only super user. */
export function canWriteAdmin(): boolean {
  return getRole() === "admin";
}

// Mock admin verification. Accepts any username mapped to admin with password "admin123".
export function verifyAdmin(username: string, password: string): boolean {
  const u = username.trim().toLowerCase();
  return USERNAME_ROLE[u] === "admin" && password === "admin123";
}
