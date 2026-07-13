// Departments module. LocalStorage-persisted.
import { audit } from "./data";

export interface Department {
  id: string;
  name: string;
  code: string;
  head?: string; // staff id
  description?: string;
  active: boolean;
  createdAt: string;
}

const KEY = "shifa.departments.v1";

const seed: Department[] = [
  {
    id: "dep-opd",
    name: "OPD / Consultation",
    code: "OPD",
    description: "Outpatient consultation",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "dep-ipd",
    name: "IPD / In-patient",
    code: "IPD",
    description: "In-patient care and wards",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "dep-lab",
    name: "Laboratory",
    code: "LAB",
    description: "Diagnostics and pathology",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "dep-phm",
    name: "Pharmacy",
    code: "PHM",
    description: "Pharmacy and inventory",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "dep-fo",
    name: "Front Office",
    code: "FO",
    description: "Reception and registration",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "dep-acc",
    name: "Accounts & Admin",
    code: "ACC",
    description: "Billing, accounts, administration",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const departments: Department[] = [...seed];

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(departments));
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
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      departments.length = 0;
      for (const d of parsed) departments.push(d);
    }
  } catch {
    /* ignore */
  }
}
hydrate();

export function addDepartment(input: Omit<Department, "id" | "createdAt">): Department {
  const d: Department = { ...input, id: `dep-${Date.now()}`, createdAt: new Date().toISOString() };
  departments.unshift(d);
  persist();
  audit("admin", "department_add", {
    entity: "department",
    entityId: d.id,
    meta: { name: d.name },
  });
  return d;
}

export function updateDepartment(id: string, patch: Partial<Department>) {
  const d = departments.find((x) => x.id === id);
  if (!d) return;
  Object.assign(d, patch);
  persist();
  audit("admin", "department_update", {
    entity: "department",
    entityId: id,
    meta: patch as Record<string, unknown>,
  });
}

export function removeDepartment(id: string) {
  const idx = departments.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const [d] = departments.splice(idx, 1);
  persist();
  audit("admin", "department_remove", {
    entity: "department",
    entityId: id,
    meta: { name: d.name },
  });
}

export function findDepartment(id?: string): Department | undefined {
  if (!id) return undefined;
  return departments.find((d) => d.id === id);
}
