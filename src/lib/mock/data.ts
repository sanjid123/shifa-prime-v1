// Simple in-memory mock data. Session-scoped only.
export type Role = "front_office" | "lab" | "pharmacy" | "admin" | "accountant" | "doctor";
export type BillingAccount = "op" | "pharmacy" | "laboratory" | "general";
export const BILLING_ACCOUNT_LABEL: Record<BillingAccount, string> = {
  op: "OP Billing",
  pharmacy: "Pharmacy Billing",
  laboratory: "Laboratory Billing",
  general: "General Billing",
};

export type DoctorType = "permanent" | "visiting";
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  type: DoctorType;
  fee: number;
  days: string[];
  active: boolean;
  /** Optional department link; when absent it's inferred from `specialty`. */
  departmentId?: string;
}
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type AppointmentStatus = "scheduled" | "waiting" | "checkedin" | "cancelled" | "noshow";
export interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  age?: number;
  gender?: "M" | "F";
  note?: string;
  doctorId: string;
  start: string;
  duration: number;
  status: AppointmentStatus;
}

export type Department = "front_office" | "lab" | "pharmacy";
export type PatientType = "OP" | "IP";

export type QueueStatus = "waiting" | "checkedin" | "cancelled";
export type PatientSource = "op" | "lab_walkin" | "pharma_walkin";
export type QueueStation = "waiting" | "with_doctor" | "sent_to_lab" | "sent_to_pharmacy" | "done";
export interface Patient {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  age: number;
  gender: "M" | "F";
  address?: string;
  allergies: string[];
  createdAt: string;
  source?: PatientSource;
  /** Optional date of birth (YYYY-MM-DD); used for stronger duplicate detection. */
  dob?: string;
  /** Optional insurance plan ID linked to this patient */
  insurancePlanId?: string;
}

/* ─── Insurance & TPA Types ─── */
export interface InsurancePlan {
  id: string;
  providerName: string;
  policyNumber: string;
  tpaName: string;
  coveragePercent: number;
  maxCover: number;
  status: "active" | "expired" | "suspended";
}
export type InsuranceClaimStatus = "pending" | "approved" | "rejected" | "settled";
export interface InsuranceClaim {
  id: string;
  invoiceId: string;
  patientId: string;
  planId: string;
  claimAmount: number;
  copayAmount: number;
  preAuthRef?: string;
  status: InsuranceClaimStatus;
  submittedAt: string;
  settledAt?: string;
  utrRef?: string;
  rejectionReason?: string;
}
export interface QueueEntry {
  id: string;
  patientId: string;
  token: number;
  doctor: string;
  status: QueueStatus;
  createdAt: string;
  labRequired?: boolean;
  station?: QueueStation;
  diagnosis?: string;
  prescription?: string;
}
export type SampleStatus = "pending" | "processing" | "ready";
export interface LabTest {
  code: string;
  name: string;
  unit: string;
  low: number;
  high: number;
  critLow?: number;
  critHigh?: number;
  value?: number | null;
  price?: number;
}
export interface LabPackage {
  id: string;
  code: string;
  name: string;
  testCodes: string[];
  price: number;
  status?: "active" | "pending";
  requestedBy?: string;
}
export type LabOrderStatus =
  | "pending"
  | "collected"
  | "in_progress"
  | "resulted"
  | "verified"
  | "dispatched"
  | "cancelled";
export type LabOrderSource = "doctor" | "front_office" | "walk_in";
export interface LabOrder {
  id: string;
  barcode: string;
  createdAt: string;
  source: LabOrderSource;
  queueId?: string;
  patientId?: string;
  opPatient?: { name: string; phone: string; age?: number; gender?: "M" | "F" | "Other" };
  testCodes: string[];
  pkgIds: string[];
  status: LabOrderStatus;
  collectedAt?: string;
  collectedBy?: string;
  invoiceId?: string;
  notes?: string;
}
export type PendingTestEditKind = "create" | "update" | "delete";
export interface PendingTestEdit {
  id: string;
  requestedBy: string;
  requestedAt: string;
  kind: PendingTestEditKind;
  targetCode?: string;
  code: string;
  name: string;
  unit: string;
  low: number;
  high: number;
  price: number;
  note?: string;
}
export interface AccountsSnapshot {
  id: string;
  scope: "lab";
  from: string;
  to: string;
  createdAt: string;
  createdBy: string;
  totals: { count: number; gross: number; discount: number; net: number };
  rows: { id: string; date: string; patient: string; type: string; items: number; gross: number; discount: number; net: number }[];
}
export interface Sample {
  id: string;
  barcode: string;
  patientId: string;
  status: SampleStatus;
  stat: boolean;
  tests: LabTest[];
  patientType?: PatientType;
  createdAt: string;
  reportedAt?: string;
  verifiedBy?: string;
  technicianName?: string;
}

export interface Drug {
  id: string;
  name: string;
  form: string;
  generic?: string;
  hsn?: string;
  rack?: string;
  manufacturer?: string;
  unit?: string;
  stock: number;
  batch: string;
  expiry: string;
  mrp: number;
  gst: number;
  reorderLevel: number;
  lasa?: string;
}
export interface RxItem {
  drugId: string;
  dose: string;
  qty: number;
}
export interface Prescription {
  id: string;
  patientId: string;
  doctor: string;
  items: RxItem[];
  dispensed: boolean;
  createdAt: string;
}
export interface InvoiceLine {
  desc: string;
  qty: number;
  rate: number;
  drugId?: string;
  hsn?: string;
  rack?: string;
  manufacturer?: string;
  batch?: string;
  expiry?: string;
  mrp?: number;
  gst?: number;
}
export interface Invoice {
  id: string;
  patientId: string;
  date: string;
  department: Department;
  billingAccount: BillingAccount;
  patientType?: PatientType;
  bed?: string;
  crossConsult?: boolean;
  parentInvoiceId?: string;
  token?: number;
  doctorName?: string;
  prescribedBy?: string;
  opVisitId?: string;
  gstRate?: 0 | 5 | 12 | 18;
  lines: InvoiceLine[];
  discount: number;
  paid: boolean;
  audit: { at: string; by: string; note: string }[];
  /** Lab OP walk-in demographics (only used by lab billing when no full patient record). */
  opPatient?: { name: string; phone: string; age?: number; gender?: "M" | "F" | "Other" };
  /** Insurance billing fields */
  insuranceClaimId?: string;
  copayAmount?: number;
  insuranceCoverAmount?: number;
}

export interface Procedure {
  id: string;
  code: string;
  name: string;
  rate: number;
}
export interface Distributor {
  id: string;
  name: string;
  gstin?: string;
  contact?: string;
  address?: string;
  openingBalance: number;
}
export interface PurchaseLine {
  drugId: string;
  batch: string;
  expiry: string;
  qty: number;
  rate: number;
  mrp: number;
  gst: number;
}
export interface Purchase {
  id: string;
  distributorId: string;
  date: string;
  lines: PurchaseLine[];
  total: number;
}
export interface PurchaseReturn {
  id: string;
  purchaseId: string;
  date: string;
  lines: PurchaseLine[];
  total: number;
  reason: string;
}
export interface SalesReturn {
  id: string;
  invoiceId: string;
  date: string;
  lines: InvoiceLine[];
  total: number;
  reason: string;
}
export interface LabPurchase {
  id: string;
  supplier: string;
  date: string;
  item: string;
  qty: number;
  rate: number;
  total: number;
}
export interface CrossConsult {
  id: string;
  patientId: string;
  parentInvoiceId: string;
  doctorId: string;
  fee: number;
  date: string;
}

/* ------------- Lab purchasing (Indent → PO → GRN → AP) ------------- */
export interface LabVendor {
  id: string;
  name: string;
  gstin: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
}
export type ReagentStorage = "room" | "fridge" | "freezer";
export interface Reagent {
  id: string;
  name: string;
  unit: string; // "tests" | "ml" | "bottle" | "pack"
  packSize: number;
  currentStock: number;
  minLevel: number;
  maxLevel: number;
  reorderQty: number;
  storage?: ReagentStorage;
  vendorId?: string;
  active: boolean;
}
export interface ReagentBatch {
  id: string;
  reagentId: string;
  batchNo: string;
  lotNo?: string;
  expiry: string; // ISO date
  receivedQty: number;
  remainingQty: number;
  grnId: string;
  costPerUnit: number;
  gstPct: number;
}
export interface TestBom {
  id: string;
  testCode: string;
  reagentId: string;
  qtyPerTest: number;
}
export type IndentStatus = "draft" | "submitted" | "approved" | "rejected" | "converted";
export type IndentSource = "manual" | "auto_min_max";
export interface LabIndent {
  id: string;
  createdAt: string;
  createdBy: string;
  source: IndentSource;
  status: IndentStatus;
  items: { reagentId: string; qty: number; note?: string }[];
  approvedBy?: string;
  approvedAt?: string;
  rejectReason?: string;
  poId?: string;
}
export type LabPOStatus = "open" | "partial" | "received" | "cancelled";
export interface LabPO {
  id: string;
  createdAt: string;
  createdBy: string;
  vendorId: string;
  indentId?: string;
  status: LabPOStatus;
  items: { reagentId: string; qty: number; rate: number; gstPct: number }[];
  subtotal: number;
  gstTotal: number;
  total: number;
}
export interface LabGRN {
  id: string;
  poId: string;
  receivedAt: string;
  receivedBy: string;
  items: {
    reagentId: string;
    qty: number;
    batchNo: string;
    lotNo?: string;
    expiry: string;
    rate: number;
    gstPct: number;
  }[];
  subtotal: number;
  gstTotal: number;
  total: number;
  apEntryId?: string;
}
export interface APEntry {
  id: string;
  sourceType: "lab_grn";
  sourceId: string;
  vendorId: string;
  amount: number;
  gstAmount: number;
  postedAt: string;
  paid?: boolean;
  paidAt?: string;
}

/* ------------- Seed data ------------- */

export const doctors: Doctor[] = [
  {
    id: "doc1",
    name: "Dr. Iqbal Ahmed",
    specialty: "General Physician",
    type: "permanent",
    fee: 400,
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    active: true,
  },
  {
    id: "doc2",
    name: "Dr. Suresh Kumar",
    specialty: "Pediatrics",
    type: "permanent",
    fee: 500,
    days: ["Mon", "Wed", "Fri", "Sat"],
    active: true,
  },
  {
    id: "doc3",
    name: "Dr. Meera Nair",
    specialty: "Gynaecology",
    type: "visiting",
    fee: 700,
    days: ["Tue", "Thu"],
    active: true,
  },
  {
    id: "doc4",
    name: "Dr. Anwar Sadiq",
    specialty: "Cardiology",
    type: "visiting",
    fee: 900,
    days: ["Sat"],
    active: true,
  },
];

export const appointments: Appointment[] = [
  {
    id: "a1",
    patientName: "Aisha Rahman",
    patientPhone: "9207510555",
    doctorId: "doc1",
    start: "09:00",
    duration: 15,
    status: "checkedin",
  },
  {
    id: "a2",
    patientName: "Mohammed Anas",
    doctorId: "doc1",
    start: "09:30",
    duration: 15,
    status: "waiting",
  },
  {
    id: "a3",
    patientName: "Fathima Zahra",
    doctorId: "doc2",
    start: "10:00",
    duration: 15,
    status: "scheduled",
  },
  {
    id: "a4",
    patientName: "Rahul Menon",
    doctorId: "doc2",
    start: "10:30",
    duration: 15,
    status: "cancelled",
  },
  {
    id: "a5",
    patientName: "Sneha Pillai",
    doctorId: "doc3",
    start: "11:00",
    duration: 30,
    status: "scheduled",
  },
  {
    id: "a6",
    patientName: "Walk-in · Zubair",
    doctorId: "doc1",
    start: "11:30",
    duration: 15,
    status: "noshow",
  },
];

const now = new Date().toISOString();
export const patients: Patient[] = [
  {
    id: "p1",
    mrn: "SC-1042",
    name: "Aisha Rahman",
    phone: "9207510555",
    age: 34,
    gender: "F",
    allergies: ["Penicillin"],
    createdAt: now,
  },
  {
    id: "p2",
    mrn: "SC-1043",
    name: "Mohammed Anas",
    phone: "9895123456",
    age: 52,
    gender: "M",
    allergies: [],
    createdAt: now,
  },
  {
    id: "p3",
    mrn: "SC-1044",
    name: "Fathima Zahra",
    phone: "9847001122",
    age: 28,
    gender: "F",
    allergies: ["Sulfa"],
    createdAt: now,
  },
  {
    id: "p4",
    mrn: "SC-1045",
    name: "Rahul Menon",
    phone: "8281999888",
    age: 41,
    gender: "M",
    allergies: [],
    createdAt: now,
  },
  {
    id: "p5",
    mrn: "SC-1046",
    name: "Sneha Pillai",
    phone: "9946223311",
    age: 7,
    gender: "F",
    allergies: ["Peanut"],
    createdAt: now,
  },
];

export const queue: QueueEntry[] = [
  { id: "q1", patientId: "p1", token: 12, doctor: "Dr. Iqbal", status: "waiting", createdAt: now },
  {
    id: "q2",
    patientId: "p2",
    token: 13,
    doctor: "Dr. Iqbal",
    status: "checkedin",
    createdAt: now,
  },
  { id: "q3", patientId: "p3", token: 14, doctor: "Dr. Suresh", status: "waiting", createdAt: now },
  {
    id: "q4",
    patientId: "p4",
    token: 15,
    doctor: "Dr. Suresh",
    status: "cancelled",
    createdAt: now,
  },
];

export const testCatalog: LabTest[] = [
  {
    code: "HGB",
    name: "Hemoglobin",
    unit: "g/dL",
    low: 12,
    high: 16,
    critLow: 6,
    critHigh: 20,
    price: 150,
  },
  {
    code: "WBC",
    name: "White Blood Cells",
    unit: "10^3/uL",
    low: 4,
    high: 11,
    critLow: 1,
    critHigh: 30,
    price: 180,
  },
  {
    code: "GLU",
    name: "Fasting Glucose",
    unit: "mg/dL",
    low: 70,
    high: 110,
    critLow: 40,
    critHigh: 500,
    price: 120,
  },
  { code: "CRE", name: "Creatinine", unit: "mg/dL", low: 0.6, high: 1.3, price: 200 },
  {
    code: "TSH",
    name: "Thyroid Stimulating Hormone",
    unit: "mIU/L",
    low: 0.4,
    high: 4.5,
    price: 350,
  },
  { code: "LIP", name: "Lipid Panel", unit: "", low: 0, high: 99999, price: 550 },
  // ==== Clinic price list (managed by Admin → Settings → Lab Prices) ====
  { code: "CBC2", name: "CBC", unit: "", low: 0, high: 99999, price: 180 },
  { code: "BSU", name: "Blood Sugar", unit: "mg/dL", low: 70, high: 110, price: 20 },
  { code: "TCH", name: "Total Cholesterol", unit: "mg/dL", low: 0, high: 200, price: 60 },
  { code: "CRP", name: "CRP", unit: "mg/L", low: 0, high: 10, price: 230 },
  { code: "TGL", name: "Triglyceride", unit: "mg/dL", low: 0, high: 150, price: 100 },
  { code: "LFT", name: "Liver Function Test", unit: "", low: 0, high: 99999, price: 350 },
  { code: "LPP", name: "Lipid Profile", unit: "", low: 0, high: 99999, price: 280 },
  { code: "RAF", name: "RA Factor", unit: "IU/mL", low: 0, high: 14, price: 200 },
  { code: "URA", name: "Uric Acid", unit: "mg/dL", low: 3.5, high: 7.2, price: 80 },
  { code: "NA", name: "Sodium", unit: "mmol/L", low: 135, high: 145, price: 100 },
  { code: "K", name: "Potassium", unit: "mmol/L", low: 3.5, high: 5.1, price: 100 },
  { code: "RFT", name: "Renal Function Test", unit: "", low: 0, high: 99999, price: 250 },
  { code: "HIV", name: "HIV (card test)", unit: "", low: 0, high: 99999, price: 230 },
  { code: "HBS", name: "HBsAg (card test)", unit: "", low: 0, high: 99999, price: 120 },
  { code: "HCV", name: "HCV (card test)", unit: "", low: 0, high: 99999, price: 350 },
  { code: "TRPI", name: "Trop I", unit: "ng/mL", low: 0, high: 99999, price: 400 },
  { code: "ALB", name: "Albumin", unit: "g/dL", low: 3.5, high: 5.5, price: 20 },
  { code: "ALP", name: "Alkaline Phosphatase", unit: "U/L", low: 44, high: 147, price: 100 },
  { code: "CA", name: "Calcium", unit: "mg/dL", low: 8.5, high: 10.5, price: 100 },
  { code: "HBA", name: "HbA1c", unit: "%", low: 4, high: 5.6, price: 350 },
  { code: "ASO", name: "ASO", unit: "IU/mL", low: 0, high: 200, price: 250 },
  { code: "AMY", name: "Amylase", unit: "U/L", low: 30, high: 110, price: 200 },
  { code: "CKMB", name: "CK-MB", unit: "U/L", low: 0, high: 25, price: 350 },
  { code: "WID", name: "Widal Slide Test", unit: "", low: 0, high: 99999, price: 150 },
  { code: "UPT", name: "Urine Pregnancy Test", unit: "", low: 0, high: 99999, price: 100 },
  { code: "BGR", name: "Blood Group", unit: "", low: 0, high: 99999, price: 50 },
  { code: "URE", name: "Urine R/E", unit: "", low: 0, high: 99999, price: 60 },
  { code: "VDRL", name: "VDRL (card test)", unit: "", low: 0, high: 99999, price: 100 },
  { code: "SGOT", name: "SGOT", unit: "U/L", low: 5, high: 40, price: 100 },
  { code: "SGPT", name: "SGPT", unit: "U/L", low: 7, high: 56, price: 100 },
  { code: "ESR", name: "ESR", unit: "mm/hr", low: 0, high: 20, price: 30 },
  { code: "TCC", name: "TC", unit: "10^3/uL", low: 4, high: 11, price: 30 },
  { code: "PLT", name: "Platelet Count", unit: "10^3/uL", low: 150, high: 450, price: 100 },
  { code: "AEC", name: "AEC", unit: "cells/uL", low: 30, high: 350, price: 100 },
  { code: "HB2", name: "Hb", unit: "g/dL", low: 12, high: 16, price: 30 },
  { code: "TSH2", name: "TSH (clinic)", unit: "mIU/L", low: 0.4, high: 4.5, price: 200 },
  { code: "TFT", name: "TFT", unit: "", low: 0, high: 99999, price: 300 },
  { code: "PRL", name: "Prolactin", unit: "ng/mL", low: 4, high: 30, price: 400 },
  { code: "URC", name: "Urine Culture", unit: "", low: 0, high: 99999, price: 250 },
  { code: "VITD", name: "Vitamin D", unit: "ng/mL", low: 30, high: 100, price: 900 },
  { code: "VD3", name: "Vitamin D3", unit: "ng/mL", low: 30, high: 100, price: 850 },
  { code: "SAFB", name: "Sputum AFB", unit: "", low: 0, high: 99999, price: 200 },
  { code: "SPC", name: "Sputum Culture", unit: "", low: 0, high: 99999, price: 200 },
  { code: "SIGE", name: "S. IgE", unit: "IU/mL", low: 0, high: 100, price: 500 },
  { code: "PSMR", name: "P. Smear", unit: "", low: 0, high: 99999, price: 360 },
  { code: "VB12", name: "Vitamin B12", unit: "pg/mL", low: 200, high: 900, price: 750 },
  { code: "LPS", name: "Lipase", unit: "U/L", low: 0, high: 160, price: 400 },
  { code: "CHIK", name: "Chikungunya IgM", unit: "", low: 0, high: 99999, price: 800 },
  { code: "UMA", name: "Urine Micro Albumin", unit: "mg/L", low: 0, high: 30, price: 350 },
  { code: "PTIN", name: "PT INR", unit: "", low: 0, high: 99999, price: 250 },
  { code: "APTT", name: "APTT", unit: "sec", low: 25, high: 35, price: 200 },
];

export const labPackages: LabPackage[] = [
  { id: "pk1", code: "CBC", name: "Complete Blood Count", testCodes: ["HGB", "WBC"], price: 300 },
  { id: "pk2", code: "DIAB", name: "Diabetes Panel", testCodes: ["GLU", "CRE"], price: 450 },
  {
    id: "pk3",
    code: "MHC-BAS",
    name: "Basic Health Checkup",
    testCodes: ["HGB", "WBC", "GLU", "CRE", "LIP"],
    price: 1200,
  },
];

export const labOrders: LabOrder[] = [
  {
    id: "LO-0001",
    barcode: "SHIFA-LO-0001",
    createdAt: now,
    source: "doctor",
    queueId: "q1",
    patientId: "p1",
    testCodes: [],
    pkgIds: [],
    status: "pending",
  },
];
export const pendingTestEdits: PendingTestEdit[] = [];
export const accountsSnapshots: AccountsSnapshot[] = [];

let _orderCounter = labOrders.length;
export function nextLabOrderId() {
  _orderCounter += 1;
  const n = String(_orderCounter).padStart(4, "0");
  return { id: `LO-${n}`, barcode: `SHIFA-LO-${n}` };
}

export const samples: Sample[] = [
  {
    id: "s1",
    barcode: "LB0001",
    patientId: "p1",
    status: "pending",
    stat: true,
    patientType: "OP",
    tests: [testCatalog[0], testCatalog[1]],
    createdAt: now,
  },
  {
    id: "s2",
    barcode: "LB0002",
    patientId: "p2",
    status: "processing",
    stat: false,
    patientType: "OP",
    tests: [testCatalog[2]],
    createdAt: now,
  },
  {
    id: "s3",
    barcode: "LB0003",
    patientId: "p3",
    status: "ready",
    stat: false,
    patientType: "OP",
    tests: [{ ...testCatalog[3], value: 0.9 }],
    createdAt: now,
  },
];

export const drugs: Drug[] = [
  {
    id: "d1",
    name: "EPINEPHrine 1mg/mL",
    form: "Injection",
    generic: "Epinephrine",
    hsn: "3004",
    rack: "A1",
    manufacturer: "Neon",
    unit: "Vial",
    stock: 24,
    batch: "EP2401",
    expiry: "2026-03-01",
    mrp: 85,
    gst: 12,
    reorderLevel: 30,
    lasa: "EPHEDrine",
  },
  {
    id: "d2",
    name: "EPHEDrine 30mg",
    form: "Tablet",
    generic: "Ephedrine",
    hsn: "3004",
    rack: "A2",
    manufacturer: "Samarth",
    unit: "Strip",
    stock: 60,
    batch: "EH2312",
    expiry: "2026-11-01",
    mrp: 12,
    gst: 12,
    reorderLevel: 40,
    lasa: "EPINEPHrine",
  },
  {
    id: "d3",
    name: "Amoxicillin 500mg",
    form: "Capsule",
    generic: "Amoxicillin",
    hsn: "3004",
    rack: "B1",
    manufacturer: "Cipla",
    unit: "Strip",
    stock: 320,
    batch: "AM2405",
    expiry: "2027-02-01",
    mrp: 14,
    gst: 12,
    reorderLevel: 100,
  },
  {
    id: "d4",
    name: "Paracetamol 650mg",
    form: "Tablet",
    generic: "Paracetamol",
    hsn: "3004",
    rack: "B2",
    manufacturer: "Micro Labs",
    unit: "Strip",
    stock: 1200,
    batch: "PC2409",
    expiry: "2027-08-01",
    mrp: 2,
    gst: 12,
    reorderLevel: 300,
  },
  {
    id: "d5",
    name: "Metformin 500mg",
    form: "Tablet",
    generic: "Metformin",
    hsn: "3004",
    rack: "C1",
    manufacturer: "USV",
    unit: "Strip",
    stock: 480,
    batch: "MF2403",
    expiry: "2026-06-01",
    mrp: 5,
    gst: 12,
    reorderLevel: 200,
  },
  {
    id: "d6",
    name: "Atorvastatin 10mg",
    form: "Tablet",
    generic: "Atorvastatin",
    hsn: "3004",
    rack: "C2",
    manufacturer: "Sun Pharma",
    unit: "Strip",
    stock: 45,
    batch: "AT2402",
    expiry: "2026-04-01",
    mrp: 7,
    gst: 12,
    reorderLevel: 100,
  },
];

export const prescriptions: Prescription[] = [
  {
    id: "rx1",
    patientId: "p1",
    doctor: "Dr. Iqbal",
    items: [{ drugId: "d3", dose: "1-0-1 x 5d", qty: 10 }],
    dispensed: false,
    createdAt: now,
  },
  {
    id: "rx2",
    patientId: "p2",
    doctor: "Dr. Iqbal",
    items: [
      { drugId: "d5", dose: "1-0-1", qty: 30 },
      { drugId: "d6", dose: "0-0-1", qty: 30 },
    ],
    dispensed: false,
    createdAt: now,
  },
  {
    id: "rx3",
    patientId: "p5",
    doctor: "Dr. Suresh",
    items: [{ drugId: "d4", dose: "SOS", qty: 6 }],
    dispensed: true,
    createdAt: now,
  },
];

export const invoices: Invoice[] = [
  {
    id: "INV-1001",
    patientId: "p1",
    date: now,
    department: "front_office",
    billingAccount: "op",
    lines: [{ desc: "Consultation · Dr. Iqbal Ahmed", qty: 1, rate: 400 }],
    discount: 0,
    paid: true,
    audit: [{ at: now, by: "reception", note: "Created" }],
  },
  {
    id: "LAB-2001",
    patientId: "p1",
    date: now,
    department: "lab",
    billingAccount: "laboratory",
    patientType: "OP",
    lines: [{ desc: "CBC (Complete Blood Count)", qty: 1, rate: 300 }],
    discount: 50,
    paid: true,
    audit: [{ at: now, by: "lab", note: "Created" }],
  },
  {
    id: "PHM-3001",
    patientId: "p1",
    date: now,
    department: "pharmacy",
    billingAccount: "pharmacy",
    lines: [{ desc: "Amoxicillin 500mg", qty: 10, rate: 14 }],
    discount: 0,
    paid: true,
    audit: [{ at: now, by: "pharmacy", note: "Created" }],
  },
  {
    id: "INV-1002",
    patientId: "p2",
    date: now,
    department: "front_office",
    billingAccount: "op",
    lines: [{ desc: "Consultation · Dr. Iqbal Ahmed", qty: 1, rate: 400 }],
    discount: 0,
    paid: false,
    audit: [{ at: now, by: "reception", note: "Created" }],
  },
  {
    id: "LAB-2002",
    patientId: "p2",
    date: now,
    department: "lab",
    billingAccount: "laboratory",
    patientType: "IP",
    bed: "Ward-2 / Bed 4",
    lines: [{ desc: "Fasting Glucose", qty: 1, rate: 120 }],
    discount: 0,
    paid: false,
    audit: [{ at: now, by: "lab", note: "Created" }],
  },
  {
    id: "PHM-3002",
    patientId: "p2",
    date: now,
    department: "pharmacy",
    billingAccount: "pharmacy",
    lines: [
      { desc: "Metformin 500mg", qty: 30, rate: 5 },
      { desc: "Atorvastatin 10mg", qty: 30, rate: 7 },
    ],
    discount: 0,
    paid: false,
    audit: [{ at: now, by: "pharmacy", note: "Created" }],
  },
  {
    id: "INV-1003",
    patientId: "p3",
    date: now,
    department: "front_office",
    billingAccount: "op",
    lines: [{ desc: "Consultation · Dr. Suresh Kumar", qty: 1, rate: 500 }],
    discount: 0,
    paid: false,
    audit: [{ at: now, by: "reception", note: "Created" }],
  },
];

export const procedures: Procedure[] = [
  { id: "pr1", code: "DRESS", name: "Wound Dressing", rate: 250 },
  { id: "pr2", code: "SUT", name: "Suturing (Minor)", rate: 800 },
  { id: "pr3", code: "NEB", name: "Nebulisation", rate: 200 },
  { id: "pr4", code: "ECG", name: "ECG", rate: 300 },
  { id: "pr5", code: "INJ", name: "Injection Administration", rate: 100 },
];

export const distributors: Distributor[] = [
  {
    id: "ds1",
    name: "MedCare Distributors",
    gstin: "32ABCDE1234F1Z5",
    contact: "9847000001",
    address: "Palakkad",
    openingBalance: 0,
  },
  {
    id: "ds2",
    name: "Kerala Pharma Supplies",
    gstin: "32XYZAB5678K1Z2",
    contact: "9847000002",
    address: "Ernakulam",
    openingBalance: 0,
  },
];

export const purchases: Purchase[] = [];
export const purchaseReturns: PurchaseReturn[] = [];
export const salesReturns: SalesReturn[] = [];
export const crossConsults: CrossConsult[] = [];
export const labPurchases: LabPurchase[] = [
  {
    id: "LP-1",
    supplier: "BioReagent Co",
    date: now,
    item: "HGB Reagent Kit",
    qty: 5,
    rate: 1200,
    total: 6000,
  },
  {
    id: "LP-2",
    supplier: "LabWare Ltd",
    date: now,
    item: "EDTA Tubes (500)",
    qty: 2,
    rate: 800,
    total: 1600,
  },
];

export const revenueSeries = [
  { day: "Mon", revenue: 18400, outstanding: 3200 },
  { day: "Tue", revenue: 21200, outstanding: 4100 },
  { day: "Wed", revenue: 17800, outstanding: 2900 },
  { day: "Thu", revenue: 24600, outstanding: 5100 },
  { day: "Fri", revenue: 28900, outstanding: 4400 },
  { day: "Sat", revenue: 33100, outstanding: 6200 },
  { day: "Sun", revenue: 15300, outstanding: 2100 },
];

/* ------------- Lab purchasing seed ------------- */
export const labVendors: LabVendor[] = [
  { id: "lv1", name: "BioReagent Co", gstin: "32BIOAB1234R1Z5", phone: "9847011111", email: "sales@bioreagent.in", address: "Ernakulam", active: true },
  { id: "lv2", name: "DiagnoKits Pvt Ltd", gstin: "29DIAAB5678K1Z2", phone: "9845022222", email: "orders@diagnokits.com", address: "Bengaluru", active: true },
];
export const reagents: Reagent[] = [
  { id: "rg1", name: "Glucose Reagent Kit", unit: "tests", packSize: 1000, currentStock: 420, minLevel: 200, maxLevel: 2000, reorderQty: 1000, storage: "fridge", vendorId: "lv1", active: true },
  { id: "rg2", name: "Total Cholesterol Reagent", unit: "tests", packSize: 500, currentStock: 180, minLevel: 100, maxLevel: 1000, reorderQty: 500, storage: "fridge", vendorId: "lv1", active: true },
  { id: "rg3", name: "HDL Direct Reagent", unit: "tests", packSize: 400, currentStock: 60, minLevel: 100, maxLevel: 800, reorderQty: 400, storage: "fridge", vendorId: "lv1", active: true },
  { id: "rg4", name: "Triglyceride Reagent", unit: "tests", packSize: 400, currentStock: 340, minLevel: 100, maxLevel: 800, reorderQty: 400, storage: "fridge", vendorId: "lv1", active: true },
  { id: "rg5", name: "HbA1c Cartridge", unit: "tests", packSize: 100, currentStock: 45, minLevel: 40, maxLevel: 400, reorderQty: 200, storage: "fridge", vendorId: "lv2", active: true },
  { id: "rg6", name: "CBC Diluent 20L", unit: "tests", packSize: 4000, currentStock: 2600, minLevel: 800, maxLevel: 8000, reorderQty: 4000, storage: "room", vendorId: "lv2", active: true },
];
export const reagentBatches: ReagentBatch[] = [
  { id: "rb1", reagentId: "rg1", batchNo: "GLU-24A", expiry: futureIso(240), receivedQty: 1000, remainingQty: 420, grnId: "seed", costPerUnit: 4.2, gstPct: 12 },
  { id: "rb2", reagentId: "rg2", batchNo: "TCH-24B", expiry: futureIso(180), receivedQty: 500, remainingQty: 180, grnId: "seed", costPerUnit: 8.5, gstPct: 12 },
  { id: "rb3", reagentId: "rg3", batchNo: "HDL-24C", expiry: futureIso(90), receivedQty: 400, remainingQty: 60, grnId: "seed", costPerUnit: 11, gstPct: 12 },
  { id: "rb4", reagentId: "rg4", batchNo: "TGL-24D", expiry: futureIso(300), receivedQty: 400, remainingQty: 340, grnId: "seed", costPerUnit: 9, gstPct: 12 },
  { id: "rb5", reagentId: "rg5", batchNo: "HBA-24E", expiry: futureIso(150), receivedQty: 100, remainingQty: 45, grnId: "seed", costPerUnit: 65, gstPct: 12 },
  { id: "rb6", reagentId: "rg6", batchNo: "CBC-24F", expiry: futureIso(400), receivedQty: 4000, remainingQty: 2600, grnId: "seed", costPerUnit: 1.5, gstPct: 12 },
];
function futureIso(days: number) {
  return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
}
export const testBoms: TestBom[] = [
  // Blood sugars all share glucose reagent
  { id: "bm1", testCode: "GLU", reagentId: "rg1", qtyPerTest: 1 },
  { id: "bm2", testCode: "BSU", reagentId: "rg1", qtyPerTest: 1 },
  // Lipid profile & individual lipids
  { id: "bm3", testCode: "TCH", reagentId: "rg2", qtyPerTest: 1 },
  { id: "bm4", testCode: "TGL", reagentId: "rg4", qtyPerTest: 1 },
  { id: "bm5", testCode: "LPP", reagentId: "rg2", qtyPerTest: 1 },
  { id: "bm6", testCode: "LPP", reagentId: "rg3", qtyPerTest: 1 },
  { id: "bm7", testCode: "LPP", reagentId: "rg4", qtyPerTest: 1 },
  { id: "bm8", testCode: "LIP", reagentId: "rg2", qtyPerTest: 1 },
  { id: "bm9", testCode: "LIP", reagentId: "rg3", qtyPerTest: 1 },
  { id: "bm10", testCode: "LIP", reagentId: "rg4", qtyPerTest: 1 },
  // HbA1c
  { id: "bm11", testCode: "HBA", reagentId: "rg5", qtyPerTest: 1 },
  // CBC-family shares diluent
  { id: "bm12", testCode: "CBC2", reagentId: "rg6", qtyPerTest: 1 },
  { id: "bm13", testCode: "WBC", reagentId: "rg6", qtyPerTest: 1 },
  { id: "bm14", testCode: "HGB", reagentId: "rg6", qtyPerTest: 1 },
  { id: "bm15", testCode: "PLT", reagentId: "rg6", qtyPerTest: 1 },
];
export const labIndents: LabIndent[] = [];
export const labPOs: LabPO[] = [];
export const labGRNs: LabGRN[] = [];
export const apEntries: APEntry[] = [];

let _rgCounter = reagents.length;
let _rbCounter = reagentBatches.length;
let _indCounter = 0, _poCounter = 0, _grnCounter = 0, _apCounter = 0, _bomCounter = testBoms.length;
export const nextReagentId = () => `rg${++_rgCounter}`;
export const nextIndentId = () => `IND-${String(++_indCounter).padStart(4, "0")}`;
export const nextPOId = () => `PO-${String(++_poCounter).padStart(4, "0")}`;
export const nextGRNId = () => `GRN-${String(++_grnCounter).padStart(4, "0")}`;
export const nextAPId = () => `AP-${String(++_apCounter).padStart(4, "0")}`;
export const nextBomId = () => `bm${++_bomCounter}`;
export const nextBatchId = () => `rb${++_rbCounter}`;

/* Consume reagents for a test using FEFO on batches. Returns blocked items if any. */
export function consumeReagentsForTest(
  testCode: string,
  opts: { rerun?: boolean } = {},
): { ok: boolean; blocked: { reagentId: string; reason: "expired" | "empty" }[]; deducted: string[] } {
  const bomRows = testBoms.filter((b) => b.testCode === testCode);
  const blocked: { reagentId: string; reason: "expired" | "empty" }[] = [];
  const deducted: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const row of bomRows) {
    const reagent = reagents.find((r) => r.id === row.reagentId);
    if (!reagent) continue;
    // FEFO: earliest non-expired batches with remaining stock
    const batches = reagentBatches
      .filter((b) => b.reagentId === row.reagentId && b.expiry >= today && b.remainingQty > 0)
      .sort((a, b) => a.expiry.localeCompare(b.expiry));
    let need = row.qtyPerTest;
    for (const b of batches) {
      if (need <= 0) break;
      const take = Math.min(need, b.remainingQty);
      b.remainingQty -= take;
      need -= take;
    }
    if (need > 0) {
      const anyRemaining = reagentBatches.some((b) => b.reagentId === row.reagentId && b.remainingQty > 0);
      blocked.push({ reagentId: row.reagentId, reason: anyRemaining ? "expired" : "empty" });
      continue;
    }
    reagent.currentStock = Math.max(0, reagent.currentStock - row.qtyPerTest);
    deducted.push(reagent.id);
  }
  if (deducted.length > 0) schedulePersist();
  if (opts.rerun) {
    /* rerun flag is informational; billing is caller's concern */
  }
  return { ok: blocked.length === 0, blocked, deducted };
}

/* Check min-max; draft auto-indent if below reorder point and none pending. */
export function checkMinMax(reagentId: string): LabIndent | null {
  const r = reagents.find((x) => x.id === reagentId);
  if (!r) return null;
  if (r.currentStock > r.minLevel) return null;
  // guard duplicates
  const existing = labIndents.find(
    (i) =>
      (i.status === "draft" || i.status === "submitted" || i.status === "approved") &&
      i.items.some((it) => it.reagentId === reagentId),
  );
  if (existing) return null;
  const ind: LabIndent = {
    id: nextIndentId(),
    createdAt: new Date().toISOString(),
    createdBy: "system",
    source: "auto_min_max",
    status: "draft",
    items: [{ reagentId, qty: r.reorderQty, note: `Auto - stock ${r.currentStock} ≤ min ${r.minLevel}` }],
  };
  labIndents.unshift(ind);
  audit("lab", "auto_indent_draft", { entity: "lab_indent", entityId: ind.id, meta: { reagentId } });
  schedulePersist();
  return ind;
}

/* Convert an approved indent into an open PO. */
export function createPOFromIndent(ind: LabIndent, vendorId: string, rates: Record<string, { rate: number; gstPct: number }>): LabPO {
  const items = ind.items.map((it) => {
    const r = rates[it.reagentId] ?? { rate: 0, gstPct: 12 };
    return { reagentId: it.reagentId, qty: it.qty, rate: r.rate, gstPct: r.gstPct };
  });
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const gstTotal = items.reduce((s, i) => s + (i.qty * i.rate * i.gstPct) / 100, 0);
  const po: LabPO = {
    id: nextPOId(),
    createdAt: new Date().toISOString(),
    createdBy: "admin",
    vendorId,
    indentId: ind.id,
    status: "open",
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    gstTotal: Math.round(gstTotal * 100) / 100,
    total: Math.round((subtotal + gstTotal) * 100) / 100,
  };
  labPOs.unshift(po);
  ind.status = "converted";
  ind.poId = po.id;
  schedulePersist();
  return po;
}



/* ------------- Audit log ------------- */
export type AuditModule = "auth" | "front_office" | "lab" | "pharmacy" | "admin" | "accountant";
export interface AuditEntry {
  id: string;
  ts: string;
  actor: string;
  role: Role | "unknown";
  module: AuditModule;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}
export const auditLog: AuditEntry[] = [];

let _auditCounter = 0;
export function audit(
  module: AuditModule,
  action: string,
  opts: {
    actor?: string;
    role?: Role | "unknown";
    entity?: string;
    entityId?: string;
    meta?: Record<string, unknown>;
  } = {},
) {
  const entry: AuditEntry = {
    id: `au${Date.now()}-${++_auditCounter}`,
    ts: new Date().toISOString(),
    actor:
      opts.actor ??
      (typeof window !== "undefined"
        ? (localStorage.getItem("shifa.username") ?? "system")
        : "system"),
    role:
      opts.role ??
      (typeof window !== "undefined"
        ? (localStorage.getItem("shifa.role") as Role) || "unknown"
        : "unknown"),
    module,
    action,
    entity: opts.entity,
    entityId: opts.entityId,
    meta: opts.meta,
  };
  auditLog.unshift(entry);
  if (auditLog.length > 5000) auditLog.length = 5000;
  schedulePersist();
  return entry;
}

/* ------------- Admin notifications ------------- */
export type NotificationType =
  | "fee_override"
  | "discount_override"
  | "procedure_proposal"
  | "info"
  | "system"
  | "alert";
export type NotificationAudience = Role | "all";
export interface Notification {
  id: string;
  ts: string;
  type: NotificationType;
  message: string;
  meta?: Record<string, unknown>;
  read: boolean;
  dismissed?: boolean;
  audience?: NotificationAudience[]; // undefined = admin/accountant only (legacy)
  title?: string;
  from?: string;
}
export const notifications: Notification[] = [];
let _notifCounter = 0;
export function notify(
  type: NotificationType,
  message: string,
  meta?: Record<string, unknown>,
  opts: { audience?: NotificationAudience[]; title?: string; from?: string } = {},
) {
  const n: Notification = {
    id: `nt${Date.now()}-${++_notifCounter}`,
    ts: new Date().toISOString(),
    type,
    message,
    meta,
    read: false,
    audience: opts.audience,
    title: opts.title,
    from: opts.from,
  };
  notifications.unshift(n);
  if (notifications.length > 1000) notifications.length = 1000;
  schedulePersist();
  return n;
}
export function markAllNotificationsRead(role?: Role) {
  for (const n of notifications) {
    if (!role || isForRole(n, role)) n.read = true;
  }
  persistNow();
}
export function markNotificationRead(id: string) {
  const n = notifications.find((x) => x.id === id);
  if (n) {
    n.read = true;
    persistNow();
  }
}
export function dismissNotification(id: string) {
  const n = notifications.find((x) => x.id === id);
  if (n) {
    n.dismissed = true;
    n.read = true;
    persistNow();
  }
}
export function clearAllNotifications(role?: Role) {
  for (const n of notifications) {
    if (!role || isForRole(n, role)) {
      n.dismissed = true;
      n.read = true;
    }
  }
  persistNow();
}
export function isForRole(n: Notification, role: Role): boolean {
  if (!n.audience || n.audience.length === 0) return role === "admin" || role === "accountant";
  if (n.audience.includes("all")) return true;
  return (n.audience as Role[]).includes(role);
}
export function notificationsFor(role: Role): Notification[] {
  return notifications.filter((n) => !n.dismissed && isForRole(n, role));
}

/* ------------- Helpers ------------- */

export function findPatient(id: string) {
  return patients.find((p) => p.id === id);
}
export function findPatientByQuery(q: string): Patient[] {
  if (!q.trim()) return [];
  const s = q.toLowerCase();
  return patients.filter(
    (p) =>
      p.name.toLowerCase().includes(s) || p.phone.includes(s) || p.mrn.toLowerCase().includes(s),
  );
}
export function nextMrn() {
  const max = patients.reduce((m, p) => {
    const n = parseInt(p.mrn.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 1000);
  return `SC-${max + 1}`;
}
export function invoiceTotal(inv: Invoice) {
  const sub = inv.lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const taxable = sub - inv.discount;
  const rate = inv.gstRate ?? 0;
  const gstAmount =
    inv.department === "pharmacy" && rate > 0 ? Math.round(taxable * rate) / 100 : 0;
  const cgst = Math.round((gstAmount / 2) * 100) / 100;
  const sgst = Math.round((gstAmount - cgst) * 100) / 100;
  return {
    subtotal: sub,
    discount: inv.discount,
    taxable,
    gstRate: rate,
    cgst,
    sgst,
    gst: gstAmount,
    total: taxable + gstAmount,
  };
}
export function belowReorder() {
  return drugs.filter((d) => d.stock <= d.reorderLevel);
}
export function expiringWithin(days: number) {
  const cutoff = Date.now() + days * 864e5;
  return drugs.filter((d) => new Date(d.expiry).getTime() <= cutoff);
}

/* ------------- Workflow-derived helpers ------------- */
export function patientSource(patientId: string): PatientSource {
  const p = findPatient(patientId);
  if (p?.source) return p.source;
  const mine = invoices.filter((i) => i.patientId === patientId);
  if (mine.some((i) => i.department === "front_office")) return "op";
  if (mine.length && mine.every((i) => i.department === "lab")) return "lab_walkin";
  if (mine.length && mine.every((i) => i.department === "pharmacy")) return "pharma_walkin";
  return "op";
}
export function gstSummary(fromISO: string, toISO: string) {
  const from = new Date(fromISO + "T00:00:00").getTime();
  const to = new Date(toISO + "T23:59:59").getTime();
  const rows: {
    hsn: string;
    taxable: number;
    cgst: number;
    sgst: number;
    total: number;
    count: number;
  }[] = [];
  let taxable = 0,
    cgst = 0,
    sgst = 0,
    total = 0,
    exempt = 0;
  for (const i of invoices) {
    const ts = new Date(i.date).getTime();
    if (ts < from || ts > to) continue;
    const t = invoiceTotal(i);
    if (i.department === "pharmacy" && (i.gstRate ?? 0) > 0) {
      const hsn = "3004";
      let row = rows.find((r) => r.hsn === hsn);
      if (!row) {
        row = { hsn, taxable: 0, cgst: 0, sgst: 0, total: 0, count: 0 };
        rows.push(row);
      }
      row.taxable += t.taxable;
      row.cgst += t.cgst;
      row.sgst += t.sgst;
      row.total += t.total;
      row.count += 1;
      taxable += t.taxable;
      cgst += t.cgst;
      sgst += t.sgst;
      total += t.total;
    } else {
      exempt += t.total;
    }
  }
  return { rows, totals: { taxable, cgst, sgst, gst: cgst + sgst, total, exempt } };
}
export function reconcile() {
  return invoices.map((i) => {
    const p = findPatient(i.patientId);
    const t = invoiceTotal(i);
    return {
      id: i.id,
      date: i.date,
      department: i.department,
      patientId: i.patientId,
      mrn: p?.mrn ?? "-",
      name: p?.name ?? "(missing)",
      ok: !!p,
      paid: i.paid,
      total: t.total,
    };
  });
}

/** Department-wise collections and patient counts for a date range. */
export function daybook(fromISO: string, toISO: string) {
  const from = new Date(fromISO + "T00:00:00").getTime();
  const to = new Date(toISO + "T23:59:59").getTime();
  const buckets = {
    op: { label: "OP / Consultation", collected: 0, outstanding: 0, count: 0 },
    procedure: { label: "Procedures", collected: 0, outstanding: 0, count: 0 },
    lab: { label: "Laboratory", collected: 0, outstanding: 0, count: 0 },
    pharmacy: { label: "Pharmacy", collected: 0, outstanding: 0, count: 0 },
  };
  const patientIds = {
    consult: new Set<string>(),
    lab_walkin: new Set<string>(),
    pharma_walkin: new Set<string>(),
  };
  for (const i of invoices) {
    const ts = new Date(i.date).getTime();
    if (ts < from || ts > to) continue;
    const t = invoiceTotal(i);
    let key: keyof typeof buckets = "op";
    if (i.department === "lab") key = "lab";
    else if (i.department === "pharmacy") key = "pharmacy";
    else if (i.id.startsWith("PRC-")) key = "procedure";
    if (i.paid) buckets[key].collected += t.total;
    else buckets[key].outstanding += t.total;
    buckets[key].count += 1;
    const src = patientSource(i.patientId);
    if (src === "op") patientIds.consult.add(i.patientId);
    else if (src === "lab_walkin") patientIds.lab_walkin.add(i.patientId);
    else patientIds.pharma_walkin.add(i.patientId);
  }
  const rows = Object.entries(buckets).map(([k, v]) => ({ key: k, ...v }));
  const totals = rows.reduce(
    (a, r) => ({
      collected: a.collected + r.collected,
      outstanding: a.outstanding + r.outstanding,
      count: a.count + r.count,
    }),
    { collected: 0, outstanding: 0, count: 0 },
  );
  const patients = {
    consulting: patientIds.consult.size,
    lab_walkin: patientIds.lab_walkin.size,
    pharma_walkin: patientIds.pharma_walkin.size,
  };
  return { rows, totals, patients };
}

/* ------------- Departments, Visits & Doctor availability ------------- */

export interface ClinicalDepartment {
  id: string;
  code: string; // GEN / ENT / ORT / DER / PED / GYN / CAR ...
  name: string;
  active: boolean;
}
export const departments: ClinicalDepartment[] = [
  { id: "dp_gen", code: "GEN", name: "General Medicine", active: true },
  { id: "dp_ped", code: "PED", name: "Pediatrics", active: true },
  { id: "dp_gyn", code: "GYN", name: "Gynaecology", active: true },
  { id: "dp_car", code: "CAR", name: "Cardiology", active: true },
  { id: "dp_ent", code: "ENT", name: "ENT", active: true },
  { id: "dp_ort", code: "ORT", name: "Orthopaedics", active: true },
  { id: "dp_der", code: "DER", name: "Dermatology", active: true },
];

export function doctorDepartmentId(doctor: Doctor): string {
  if (doctor.departmentId) return doctor.departmentId;
  const s = (doctor.specialty || "").toLowerCase();
  if (s.includes("pediatr") || s.includes("paediatr")) return "dp_ped";
  if (s.includes("gyn")) return "dp_gyn";
  if (s.includes("cardio")) return "dp_car";
  if (s.includes("ent") || s.includes("otorhino")) return "dp_ent";
  if (s.includes("ortho")) return "dp_ort";
  if (s.includes("derma") || s.includes("skin")) return "dp_der";
  return "dp_gen";
}

export type VisitType = "new" | "returning" | "review" | "emergency";
export type VisitStatus =
  | "registered"
  | "consulting"
  | "lab_pending"
  | "pharmacy_pending"
  | "completed"
  | "cancelled";

export interface Visit {
  id: string; // VIS-YYYY-NNNNNN
  patientId: string;
  departmentId: string;
  doctorId: string;
  visitType: VisitType;
  token: string; // ENT-001 (per-department, resets daily)
  status: VisitStatus;
  fee: number;
  feePaid: boolean;
  invoiceId?: string;
  queueId?: string;
  diagnosis?: string;
  prescription?: string;
  createdAt: string;
  closedAt?: string;
  labOrderIds: string[];
  pharmacyBillIds: string[];
}
export const visits: Visit[] = [];

let _visitCounter = 0;
export function nextVisitId(): string {
  _visitCounter += 1;
  const y = new Date().getFullYear();
  return `VIS-${y}-${String(_visitCounter).padStart(6, "0")}`;
}

// Per-department daily token counters; resets automatically on new day.
const _tokenState: { day: string; counters: Record<string, number> } = {
  day: new Date().toDateString(),
  counters: {},
};
export function nextDeptToken(deptCode: string): string {
  const today = new Date().toDateString();
  if (_tokenState.day !== today) {
    _tokenState.day = today;
    _tokenState.counters = {};
  }
  _tokenState.counters[deptCode] = (_tokenState.counters[deptCode] || 0) + 1;
  return `${deptCode}-${String(_tokenState.counters[deptCode]).padStart(3, "0")}`;
}
export function resetDailyCounters() {
  _tokenState.day = new Date().toDateString();
  _tokenState.counters = {};
}

export function findDuplicatePatients(opts: {
  phone?: string;
  name?: string;
  dob?: string;
  age?: number;
  gender?: "M" | "F";
}): Patient[] {
  const phone = (opts.phone || "").replace(/\D/g, "");
  const name = (opts.name || "").trim().toLowerCase();
  const dob = opts.dob;
  const matches = new Map<string, Patient>();
  for (const p of patients) {
    if (phone && p.phone && p.phone === phone) {
      matches.set(p.id, p);
      continue;
    }
    if (name && p.name.toLowerCase() === name) {
      if (dob && p.dob && p.dob === dob) matches.set(p.id, p);
      else if (
        opts.age != null &&
        Math.abs((p.age || 0) - opts.age) <= 1 &&
        (!opts.gender || p.gender === opts.gender)
      ) {
        matches.set(p.id, p);
      }
    }
  }
  return [...matches.values()];
}

export interface PatientSummary {
  totalVisits: number;
  totalBills: number;
  lastVisitAt?: string;
  lastDoctor?: string;
  lastLabAt?: string;
  lastLabName?: string;
  lastMedAt?: string;
  lastMed?: string;
}
export function patientSummary(patientId: string): PatientSummary {
  const invs = invoices.filter((i) => i.patientId === patientId);
  const vs = visits
    .filter((v) => v.patientId === patientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const lastVisit = vs[0];
  const lastLab = samples
    .filter((s) => s.patientId === patientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const lastRx = prescriptions
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const lastDoctor = lastVisit ? doctors.find((d) => d.id === lastVisit.doctorId)?.name : undefined;
  const lastMed = lastRx ? drugs.find((d) => d.id === lastRx.items[0]?.drugId)?.name : undefined;
  return {
    totalVisits: vs.length,
    totalBills: invs.length,
    lastVisitAt: lastVisit?.createdAt,
    lastDoctor,
    lastLabAt: lastLab?.createdAt,
    lastLabName: lastLab?.tests[0]?.name,
    lastMedAt: lastRx?.createdAt,
    lastMed,
  };
}

export function createVisit(input: {
  patientId: string;
  departmentId: string;
  doctorId: string;
  visitType: VisitType;
  fee: number;
  feePaid?: boolean;
  insuranceClaim?: {
    planId: string;
    preAuthRef?: string;
  };
}): { visit: Visit; invoice?: Invoice; queueEntry: QueueEntry } {
  const dept = departments.find((d) => d.id === input.departmentId);
  const doctor = doctors.find((d) => d.id === input.doctorId);
  if (!dept) throw new Error("Department not found");
  if (!doctor) throw new Error("Doctor not found");
  const token = nextDeptToken(dept.code);
  const createdAt = new Date().toISOString();
  const v: Visit = {
    id: nextVisitId(),
    patientId: input.patientId,
    departmentId: input.departmentId,
    doctorId: input.doctorId,
    visitType: input.visitType,
    token,
    status: "registered",
    fee: input.fee,
    feePaid: !!input.feePaid,
    createdAt,
    labOrderIds: [],
    pharmacyBillIds: [],
  };
  let inv: Invoice | undefined;
  if (input.feePaid || input.insuranceClaim) {
    const invId = `INV-${Date.now()}`;
    let copay = input.fee;
    let insCover = 0;
    let claimId: string | undefined;

    if (input.insuranceClaim) {
      const plan = findInsurancePlan(input.insuranceClaim.planId);
      if (plan) {
        insCover = Math.min(input.fee * (plan.coveragePercent / 100), plan.maxCover);
        copay = input.fee - insCover;

        // Generate Claim
        const claim = addInsuranceClaim({
          invoiceId: invId,
          patientId: input.patientId,
          planId: plan.id,
          claimAmount: insCover,
          copayAmount: copay,
          preAuthRef: input.insuranceClaim.preAuthRef,
          status: "pending",
          submittedAt: createdAt,
        });
        claimId = claim.id;
      }
    }

    inv = {
      id: invId,
      patientId: input.patientId,
      date: createdAt,
      department: "front_office",
      billingAccount: "op",
      lines: [
        {
          desc: `Consultation · ${doctor.name}` + (input.insuranceClaim ? ` (Co-pay Split)` : ""),
          qty: 1,
          rate: input.fee,
        },
      ],
      discount: 0,
      paid: input.insuranceClaim ? false : true, // Invoice isn't fully paid until insurance claims are settled, or copay paid
      doctorName: doctor.name,
      opVisitId: v.id,
      audit: [{ at: createdAt, by: "reception", note: `Visit ${v.id}` + (input.insuranceClaim ? ` [Insurance Claim ${claimId} created]` : "") }],
      insuranceClaimId: claimId,
      copayAmount: copay,
      insuranceCoverAmount: insCover,
    };
    invoices.unshift(inv);
    v.invoiceId = inv.id;
  }
  const qe: QueueEntry = {
    id: `q${Date.now()}`,
    patientId: input.patientId,
    token: _visitCounter,
    doctor: doctor.name,
    status: "waiting",
    createdAt,
    station: "waiting",
  };
  queue.unshift(qe);
  v.queueId = qe.id;
  visits.unshift(v);
  audit("front_office", "visit_create", {
    entity: "visit",
    entityId: v.id,
    meta: { deptCode: dept.code, token, doctorId: doctor.id, visitType: input.visitType, insuranceClaim: !!input.insuranceClaim },
  });
  schedulePersist();
  return { visit: v, invoice: inv, queueEntry: qe };
}

/** Update a visit's status and (optionally) diagnosis / prescription. */
export function setVisitStatus(
  visitId: string,
  status: VisitStatus,
  extra?: { diagnosis?: string; prescription?: string; labOrderId?: string; pharmacyBillId?: string },
) {
  const v = visits.find((x) => x.id === visitId);
  if (!v) return;
  v.status = status;
  if (extra?.diagnosis !== undefined) v.diagnosis = extra.diagnosis;
  if (extra?.prescription !== undefined) v.prescription = extra.prescription;
  if (extra?.labOrderId) v.labOrderIds.push(extra.labOrderId);
  if (extra?.pharmacyBillId) v.pharmacyBillIds.push(extra.pharmacyBillId);
  if (status === "completed" || status === "cancelled") v.closedAt = new Date().toISOString();
  schedulePersist();
}

export type DoctorAvailabilityStatus = "present" | "absent" | "leave";
export interface DoctorAvailability {
  doctorId: string;
  date: string; // YYYY-MM-DD
  status: DoctorAvailabilityStatus;
}
export const doctorAvailability: DoctorAvailability[] = [];
export function getDoctorAvailability(doctorId: string, dateISO?: string): DoctorAvailabilityStatus {
  const d = dateISO ?? new Date().toISOString().slice(0, 10);
  return doctorAvailability.find((a) => a.doctorId === doctorId && a.date === d)?.status ?? "present";
}
export function setDoctorAvailabilityFor(doctorId: string, dateISO: string, status: DoctorAvailabilityStatus) {
  const existing = doctorAvailability.find((a) => a.doctorId === doctorId && a.date === dateISO);
  if (existing) existing.status = status;
  else doctorAvailability.push({ doctorId, date: dateISO, status });
  schedulePersist();
}

/* ------------- Persistence (localStorage) ------------- */
const STORE_KEY = "shifa.store.v1";
const _arrays: { key: string; ref: unknown[] }[] = [
  { key: "patients", ref: patients },
  { key: "doctors", ref: doctors },
  { key: "departments", ref: departments },
  { key: "visits", ref: visits },
  { key: "doctorAvailability", ref: doctorAvailability },
  { key: "appointments", ref: appointments },
  { key: "queue", ref: queue },
  { key: "samples", ref: samples },
  { key: "drugs", ref: drugs },
  { key: "prescriptions", ref: prescriptions },
  { key: "invoices", ref: invoices },
  { key: "procedures", ref: procedures },
  { key: "distributors", ref: distributors },
  { key: "purchases", ref: purchases },
  { key: "purchaseReturns", ref: purchaseReturns },
  { key: "salesReturns", ref: salesReturns },
  { key: "crossConsults", ref: crossConsults },
  { key: "labPurchases", ref: labPurchases },
  { key: "labPackages", ref: labPackages },
  { key: "labOrders", ref: labOrders },
  { key: "pendingTestEdits", ref: pendingTestEdits },
  { key: "accountsSnapshots", ref: accountsSnapshots },
  { key: "labVendors", ref: labVendors },
  { key: "reagents", ref: reagents },
  { key: "reagentBatches", ref: reagentBatches },
  { key: "testBoms", ref: testBoms },
  { key: "labIndents", ref: labIndents },
  { key: "labPOs", ref: labPOs },
  { key: "labGRNs", ref: labGRNs },
  { key: "apEntries", ref: apEntries },
  { key: "auditLog", ref: auditLog },
  { key: "notifications", ref: notifications },
];
function _replaceInPlace<T>(target: T[], next: T[]) {
  target.length = 0;
  for (const x of next) target.push(x);
}
export function persistNow() {
  if (typeof window === "undefined") return;
  const snap: Record<string, unknown> = {};
  for (const a of _arrays) snap[a.key] = a.ref;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(snap));
  } catch {
    /* quota */
  }
}
let _persistTimer: number | null = null;
export function schedulePersist() {
  if (typeof window === "undefined") return;
  if (_persistTimer != null) return;
  _persistTimer = window.setTimeout(() => {
    _persistTimer = null;
    persistNow();
  }, 250);
}
function _hydrate() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const a of _arrays) {
      const next = parsed[a.key];
      if (Array.isArray(next)) _replaceInPlace(a.ref, next as unknown[]);
    }
  } catch {
    /* ignore */
  }
}
_hydrate();
if (typeof window !== "undefined") {
  window.setInterval(persistNow, 1500);
  window.addEventListener("beforeunload", persistNow);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persistNow();
  });
}

/* ------------- Front Office reset ------------- */
/**
 * Wipes all Front Office-owned transactional data + patients, and resets
 * MRN / visit / token counters. Doctors master + Lab/Pharmacy stay intact.
 * Called manually from Admin > Backup, and once automatically per bootstrap
 * key (see below).
 */
export function resetFrontOffice(): void {
  _replaceInPlace(patients, []);
  _replaceInPlace(visits, []);
  _replaceInPlace(queue, []);
  _replaceInPlace(appointments, []);
  _replaceInPlace(invoices, []);
  _replaceInPlace(crossConsults, []);
  _replaceInPlace(doctorAvailability, []);
  _visitCounter = 0;
  _tokenState.day = new Date().toDateString();
  _tokenState.counters = {};
  try {
    audit("front_office", "reset_front_office", { entity: "system", meta: { at: new Date().toISOString() } });
  } catch {
    /* audit may not be ready during first load */
  }
  persistNow();
}

/** Aggregate tiles used by Admin dashboard to mirror Front Office activity. */
export function frontOfficeTodayStats() {
  const today = new Date().toDateString();
  const todayRegs = patients.filter((p) => new Date(p.createdAt).toDateString() === today).length;
  const todayVisits = visits.filter((v) => new Date(v.createdAt).toDateString() === today).length;
  const waiting = queue.filter((q) => q.status === "waiting").length;
  const collections = invoices
    .filter((i) => i.department === "front_office" && new Date(i.date).toDateString() === today && i.paid)
    .reduce((s, i) => {
      const sub = i.lines.reduce((ss, l) => ss + l.qty * l.rate, 0);
      return s + Math.max(0, sub - (i.discount || 0));
    }, 0);
  const doctorsPresent = doctors.filter((d) => d.active && getDoctorAvailability(d.id) === "present").length;
  return { todayRegs, todayVisits, waiting, collections, doctorsPresent };
}

// One-shot bootstrap reset: runs once per browser after this version ships,
// so the current preview starts on a clean Front Office slate.
if (typeof window !== "undefined") {
  const FO_RESET_KEY = "shifa.fo.reset.v3";
  try {
    if (!localStorage.getItem(FO_RESET_KEY)) {
      resetFrontOffice();
      localStorage.setItem(FO_RESET_KEY, new Date().toISOString());
    }
  } catch {
    /* localStorage blocked */
  }
}

/* ------------- Lab reset ------------- */
/**
 * Wipes all Lab-owned transactional data: orders, samples, lab invoices,
 * indents, POs, GRNs, AP entries, pending test edits. Reagent master +
 * BOMs stay; batches reseed to default opening stock so the module is
 * usable immediately after reset. Front Office / Pharmacy untouched.
 */
export function resetLab(): void {
  _replaceInPlace(labOrders, []);
  _replaceInPlace(samples, []);
  _replaceInPlace(labIndents, []);
  _replaceInPlace(labPOs, []);
  _replaceInPlace(labGRNs, []);
  _replaceInPlace(apEntries, []);
  _replaceInPlace(pendingTestEdits, []);
  // Strip lab invoices from the shared invoices ledger.
  _replaceInPlace(invoices, invoices.filter((i) => i.department !== "lab"));
  // Reseed reagent batches to opening stock so the lab can operate post-reset.
  _replaceInPlace(reagentBatches, [
    { id: "rb1", reagentId: "rg1", batchNo: "GLU-24A", expiry: futureIso(240), receivedQty: 1000, remainingQty: 1000, grnId: "seed", costPerUnit: 4.2, gstPct: 12 },
    { id: "rb2", reagentId: "rg2", batchNo: "TCH-24B", expiry: futureIso(180), receivedQty: 500, remainingQty: 500, grnId: "seed", costPerUnit: 8.5, gstPct: 12 },
    { id: "rb3", reagentId: "rg3", batchNo: "HDL-24C", expiry: futureIso(90), receivedQty: 400, remainingQty: 400, grnId: "seed", costPerUnit: 11, gstPct: 12 },
    { id: "rb4", reagentId: "rg4", batchNo: "TGL-24D", expiry: futureIso(300), receivedQty: 400, remainingQty: 400, grnId: "seed", costPerUnit: 9, gstPct: 12 },
    { id: "rb5", reagentId: "rg5", batchNo: "HBA-24E", expiry: futureIso(150), receivedQty: 100, remainingQty: 100, grnId: "seed", costPerUnit: 65, gstPct: 12 },
    { id: "rb6", reagentId: "rg6", batchNo: "CBC-24F", expiry: futureIso(400), receivedQty: 4000, remainingQty: 4000, grnId: "seed", costPerUnit: 1.5, gstPct: 12 },
  ]);
  for (const r of reagents) {
    const total = reagentBatches
      .filter((b) => b.reagentId === r.id)
      .reduce((s, b) => s + b.remainingQty, 0);
    r.currentStock = total;
  }
  _orderCounter = 0;
  _indCounter = 0;
  _poCounter = 0;
  _grnCounter = 0;
  _apCounter = 0;
  try {
    audit("lab", "reset_lab", { entity: "system", meta: { at: new Date().toISOString() } });
  } catch {
    /* audit may not be ready during first load */
  }
  persistNow();
}

/** Aggregate tiles used by Admin dashboard to mirror Lab activity. */
export function labTodayStats() {
  const today = new Date().toDateString();
  const todayOrders = labOrders.filter((o) => new Date(o.createdAt).toDateString() === today).length;
  const pending = samples.filter((s) => s.status === "pending" || s.status === "processing").length;
  const ready = samples.filter((s) => s.status === "ready").length;
  const dispatched = 0;
  const collections = invoices
    .filter((i) => i.department === "lab" && new Date(i.date).toDateString() === today && i.paid)
    .reduce((s, i) => {
      const sub = i.lines.reduce((ss, l) => ss + l.qty * l.rate, 0);
      return s + Math.max(0, sub - (i.discount || 0));
    }, 0);
  const expiringBatches = reagentBatches.filter((b) => {
    const days = (new Date(b.expiry).getTime() - Date.now()) / 864e5;
    return b.remainingQty > 0 && days <= 60;
  }).length;
  return { todayOrders, pending, ready, dispatched, collections, expiringBatches };
}

// One-shot bootstrap reset for Lab.
if (typeof window !== "undefined") {
  const LAB_RESET_KEY = "shifa.lab.reset.v1";
  try {
    if (!localStorage.getItem(LAB_RESET_KEY)) {
      resetLab();
      localStorage.setItem(LAB_RESET_KEY, new Date().toISOString());
    }
  } catch {
    /* localStorage blocked */
  }
}

/* ------------- Pharmacy reset ------------- */
// Snapshot opening state so we can restore on reset.
const _drugsSeed = JSON.parse(JSON.stringify(drugs)) as Drug[];
const _distSeed = JSON.parse(JSON.stringify(distributors)) as Distributor[];
const _prescriptionsSeed = JSON.parse(JSON.stringify(prescriptions)) as Prescription[];

/**
 * Wipes all Pharmacy-owned transactional data: pharmacy invoices, purchases,
 * purchase returns, sales returns. Restores drug master + distributors +
 * prescriptions to opening seed so the counter is usable immediately.
 * Front Office / Lab untouched.
 */
export function resetPharmacy(): void {
  _replaceInPlace(purchases, []);
  _replaceInPlace(purchaseReturns, []);
  _replaceInPlace(salesReturns, []);
  _replaceInPlace(invoices, invoices.filter((i) => i.department !== "pharmacy"));
  _replaceInPlace(drugs, JSON.parse(JSON.stringify(_drugsSeed)));
  _replaceInPlace(distributors, JSON.parse(JSON.stringify(_distSeed)));
  _replaceInPlace(prescriptions, JSON.parse(JSON.stringify(_prescriptionsSeed)));
  try {
    audit("pharmacy", "reset_pharmacy", { entity: "system", meta: { at: new Date().toISOString() } });
  } catch {
    /* audit may not be ready during first load */
  }
  persistNow();
}

/** Aggregate tiles used by Admin dashboard to mirror Pharmacy activity. */
export function pharmacyTodayStats() {
  const today = new Date().toDateString();
  const todayInvs = invoices.filter((i) => i.department === "pharmacy" && new Date(i.date).toDateString() === today);
  const todaySales = todayInvs.reduce((s, i) => {
    const sub = i.lines.reduce((ss, l) => ss + l.qty * l.rate, 0);
    return s + Math.max(0, sub - (i.discount || 0));
  }, 0);
  const rxCount = todayInvs.length;
  const lowStock = drugs.filter((d) => d.stock < (d.reorderLevel ?? 0)).length;
  const expiring30 = drugs.filter((d) => {
    if (!d.expiry) return false;
    const days = (new Date(d.expiry).getTime() - Date.now()) / 864e5;
    return days >= 0 && days <= 30;
  }).length;
  const stockUnits = drugs.reduce((s, d) => s + d.stock, 0);
  return { todaySales, rxCount, lowStock, expiring30, stockUnits };
}

// One-shot bootstrap reset for Pharmacy.
if (typeof window !== "undefined") {
  const PHM_RESET_KEY = "shifa.pharmacy.reset.v1";
  try {
    if (!localStorage.getItem(PHM_RESET_KEY)) {
      resetPharmacy();
      localStorage.setItem(PHM_RESET_KEY, new Date().toISOString());
    }
  } catch {
    /* localStorage blocked */
  }
}



/* ------------- Snapshot export/import (backup/restore) ------------- */
export interface Snapshot {
  version: 1;
  exportedAt: string;
  data: Record<string, unknown[]>;
}
export function exportSnapshot(): Snapshot {
  const data: Record<string, unknown[]> = {};
  for (const a of _arrays) data[a.key] = [...a.ref];
  return { version: 1, exportedAt: new Date().toISOString(), data };
}
export function importSnapshot(snap: Snapshot): { restored: string[] } {
  const restored: string[] = [];
  if (!snap || snap.version !== 1 || !snap.data) throw new Error("Invalid snapshot");
  for (const a of _arrays) {
    const next = snap.data[a.key];
    if (Array.isArray(next)) {
      _replaceInPlace(a.ref, next as unknown[]);
      restored.push(a.key);
    }
  }
  persistNow();
  return { restored };
}
export function snapshotCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of _arrays) out[a.key] = a.ref.length;
  return out;
}

/* ============================================================
   Accountant module - day-close, AR/AP aging, doctor payouts
   ============================================================ */

export interface DayClose {
  id: string;
  date: string; // YYYY-MM-DD
  closedAt: string;
  closedBy: string;
  collected: number;
  outstanding: number;
  bills: number;
  cashInHand: number;
  note?: string;
}
export const dayCloses: DayClose[] = [];

export interface PettyCash {
  id: string;
  date: string;
  head: string; // e.g. Tea, Courier, Stationery
  amount: number;
  by: string;
  note?: string;
}
export const pettyCash: PettyCash[] = [];

let _dcCounter = 0;
let _pcCounter = 0;
export const nextDayCloseId = () => `DC-${String(++_dcCounter).padStart(4, "0")}`;
export const nextPettyCashId = () => `PC-${String(++_pcCounter).padStart(4, "0")}`;

/** Bucket amount by age in days. */
function bucketFor(days: number): "d0_30" | "d31_60" | "d61_90" | "d90plus" {
  if (days <= 30) return "d0_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90plus";
}

export interface ARRow {
  patientId: string;
  patientName: string;
  department: string;
  total: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  invoiceIds: string[];
}

/** Accounts receivable aging - unpaid invoices grouped by patient + department. */
export function arAging(): { rows: ARRow[]; totals: { d0_30: number; d31_60: number; d61_90: number; d90plus: number; total: number } } {
  const now = Date.now();
  const map = new Map<string, ARRow>();
  for (const inv of invoices) {
    if (inv.paid) continue;
    const { total } = invoiceTotal(inv);
    if (total <= 0) continue;
    const days = Math.max(0, Math.floor((now - new Date(inv.date).getTime()) / 864e5));
    const bucket = bucketFor(days);
    const patient = findPatient(inv.patientId);
    const key = `${inv.patientId}|${inv.department}`;
    let row = map.get(key);
    if (!row) {
      row = {
        patientId: inv.patientId,
        patientName: patient?.name ?? "(unknown)",
        department: inv.department ?? "general",
        total: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0,
        invoiceIds: [],
      };
      map.set(key, row);
    }
    row.total += total;
    row[bucket] += total;
    row.invoiceIds.push(inv.id);
  }
  const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);
  const totals = rows.reduce(
    (t, r) => ({
      d0_30: t.d0_30 + r.d0_30,
      d31_60: t.d31_60 + r.d31_60,
      d61_90: t.d61_90 + r.d61_90,
      d90plus: t.d90plus + r.d90plus,
      total: t.total + r.total,
    }),
    { d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 },
  );
  return { rows, totals };
}

export interface APRow {
  vendorId: string;
  vendorName: string;
  total: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  entryIds: string[];
}

/** Accounts payable aging - unpaid AP entries grouped by vendor (from Lab GRNs). */
export function apAging(): { rows: APRow[]; totals: { d0_30: number; d31_60: number; d61_90: number; d90plus: number; total: number } } {
  const now = Date.now();
  const vendors = new Map<string, string>();
  for (const v of labVendors) vendors.set(v.id, v.name);
  for (const d of distributors) vendors.set(d.id, d.name);
  const map = new Map<string, APRow>();
  for (const e of apEntries) {
    if (e.paid) continue;
    const days = Math.max(0, Math.floor((now - new Date(e.postedAt).getTime()) / 864e5));
    const bucket = bucketFor(days);
    let row = map.get(e.vendorId);
    if (!row) {
      row = {
        vendorId: e.vendorId,
        vendorName: vendors.get(e.vendorId) ?? "(unknown)",
        total: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0,
        entryIds: [],
      };
      map.set(e.vendorId, row);
    }
    row.total += e.amount;
    row[bucket] += e.amount;
    row.entryIds.push(e.id);
  }
  const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);
  const totals = rows.reduce(
    (t, r) => ({
      d0_30: t.d0_30 + r.d0_30,
      d31_60: t.d31_60 + r.d31_60,
      d61_90: t.d61_90 + r.d61_90,
      d90plus: t.d90plus + r.d90plus,
      total: t.total + r.total,
    }),
    { d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 },
  );
  return { rows, totals };
}

/** Doctor payout for a date range: sum of consultation invoices attributed to the doctor,
 *  multiplied by the doctor's share (default 60% permanent, 40% visiting). */
export interface DoctorPayoutRow {
  doctorId: string;
  doctorName: string;
  consultCount: number;
  gross: number;
  sharePct: number;
  payout: number;
  tds: number;
  net: number;
}
export function doctorPayouts(fromISO: string, toISO: string): DoctorPayoutRow[] {
  const start = new Date(fromISO).getTime();
  const end = new Date(toISO).getTime() + 864e5 - 1;
  const rows: DoctorPayoutRow[] = [];
  for (const d of doctors) {
    if (!d.active) continue;
    const mine = invoices.filter((i) => {
      const t = new Date(i.date).getTime();
      if (t < start || t > end) return false;
      if (!i.paid) return false;
      return (i.lines ?? []).some((l) => (l.desc ?? "").includes(d.name));
    });
    const gross = mine.reduce((s, i) => s + invoiceTotal(i).total, 0);
    const sharePct = d.type === "permanent" ? 60 : 40;
    const payout = Math.round((gross * sharePct) / 100);
    const tds = Math.round(payout * 0.1); // 194J default 10%
    rows.push({
      doctorId: d.id,
      doctorName: d.name,
      consultCount: mine.length,
      gross,
      sharePct,
      payout,
      tds,
      net: payout - tds,
    });
  }
  return rows.sort((a, b) => b.net - a.net);
}

/** Close today: freezes the day, records collections + cash-in-hand, writes audit. */
export function performDayClose(closedBy: string, openingFloat = 5000): DayClose {
  const today = new Date().toISOString().slice(0, 10);
  const dayInvs = invoices.filter((i) => i.date.slice(0, 10) === today);
  const collected = dayInvs
    .filter((i) => i.paid)
    .reduce((s, i) => s + invoiceTotal(i).total, 0);
  const outstanding = dayInvs
    .filter((i) => !i.paid)
    .reduce((s, i) => s + invoiceTotal(i).total, 0);
  const petty = pettyCash
    .filter((p) => p.date.slice(0, 10) === today)
    .reduce((s, p) => s + p.amount, 0);
  const cashInHand = openingFloat + collected - petty;
  const dc: DayClose = {
    id: nextDayCloseId(),
    date: today,
    closedAt: new Date().toISOString(),
    closedBy,
    collected,
    outstanding,
    bills: dayInvs.length,
    cashInHand,
  };
  dayCloses.unshift(dc);
  try {
    audit("accountant", "day_close", { entity: "day", entityId: dc.id, meta: { date: today, collected, cashInHand } });
  } catch { /* audit not ready */ }
  persistNow();
  return dc;
}

/** True if the given YYYY-MM-DD date has already been closed. */
export function isDayClosed(dateISO: string): boolean {
  const d = dateISO.slice(0, 10);
  return dayCloses.some((c) => c.date === d);
}


/* ======================================================================
   Module Settings - Pharmacy / Front Office / HR
   ====================================================================== */

export interface PharmacySettings {
  scheduleHGate: boolean;
  fefoPicking: boolean;
  refundCapINR: number;
  requireDayClose: boolean;
  defaultGst: 0 | 5 | 12 | 18;
  autoReorderEnabled: boolean;
  expiryAlertDays: number;
}
export interface FrontOfficeSettings {
  requirePhoneOtp: boolean;
  strictDuplicateMrn: boolean;
  allowWalkIn: boolean;
  discountNoApprovalPct: number;
  discountReasonThresholdPct: number;
  tokenPrefix: string;
  opSlipPrefix: string;
}
export interface HrSettings {
  leaveCL: number;
  leaveSL: number;
  leaveEL: number;
  carryForwardCap: number;
  attendanceGraceMin: number;
  halfDayCutoffMin: number;
  overtimeMultiplier: number;
}
export interface SalaryComponent {
  id: string;
  label: string;
  kind: "earning" | "deduction";
  defaultPct: number;
}
export interface ConsultTier {
  doctor: string;
  newVisit: number;
  followUp: number;
  teleconsult: number;
}

export const pharmacySettings: PharmacySettings = {
  scheduleHGate: true,
  fefoPicking: true,
  refundCapINR: 1000,
  requireDayClose: true,
  defaultGst: 12,
  autoReorderEnabled: true,
  expiryAlertDays: 90,
};
export const frontOfficeSettings: FrontOfficeSettings = {
  requirePhoneOtp: false,
  strictDuplicateMrn: true,
  allowWalkIn: true,
  discountNoApprovalPct: 10,
  discountReasonThresholdPct: 5,
  tokenPrefix: "T",
  opSlipPrefix: "OP",
};
export const hrSettings: HrSettings = {
  leaveCL: 12,
  leaveSL: 10,
  leaveEL: 15,
  carryForwardCap: 30,
  attendanceGraceMin: 10,
  halfDayCutoffMin: 240,
  overtimeMultiplier: 1.5,
};
export const salaryComponents: SalaryComponent[] = [
  { id: "sc-basic", label: "Basic", kind: "earning", defaultPct: 50 },
  { id: "sc-hra", label: "HRA", kind: "earning", defaultPct: 20 },
  { id: "sc-da", label: "DA", kind: "earning", defaultPct: 10 },
  { id: "sc-pf", label: "PF (Employee)", kind: "deduction", defaultPct: 12 },
  { id: "sc-esi", label: "ESI", kind: "deduction", defaultPct: 0.75 },
  { id: "sc-pt", label: "Professional Tax", kind: "deduction", defaultPct: 0 },
  { id: "sc-tds", label: "TDS", kind: "deduction", defaultPct: 0 },
];
export const consultTiers: ConsultTier[] = [
  { doctor: "Dr. Suresh Kumar", newVisit: 500, followUp: 300, teleconsult: 400 },
  { doctor: "Dr. Priya Menon", newVisit: 600, followUp: 350, teleconsult: 500 },
];

export function updatePharmacySettings(patch: Partial<PharmacySettings>) {
  Object.assign(pharmacySettings, patch);
  try { audit("admin", "pharmacy_settings_update", { entity: "settings", meta: patch as Record<string, unknown> }); } catch {}
}
export function updateFrontOfficeSettings(patch: Partial<FrontOfficeSettings>) {
  Object.assign(frontOfficeSettings, patch);
  try { audit("admin", "fo_settings_update", { entity: "settings", meta: patch as Record<string, unknown> }); } catch {}
}
export function updateHrSettings(patch: Partial<HrSettings>) {
  Object.assign(hrSettings, patch);
  try { audit("admin", "hr_settings_update", { entity: "settings", meta: patch as Record<string, unknown> }); } catch {}
}
export function upsertSalaryComponent(c: SalaryComponent) {
  const idx = salaryComponents.findIndex((x) => x.id === c.id);
  if (idx >= 0) salaryComponents[idx] = c; else salaryComponents.push(c);
  try { audit("admin", "salary_component_upsert", { entity: "salary_component", entityId: c.id, meta: { label: c.label } }); } catch {}
}
export function removeSalaryComponent(id: string) {
  const idx = salaryComponents.findIndex((x) => x.id === id);
  if (idx >= 0) salaryComponents.splice(idx, 1);
  try { audit("admin", "salary_component_remove", { entity: "salary_component", entityId: id }); } catch {}
}
export function upsertConsultTier(t: ConsultTier) {
  const idx = consultTiers.findIndex((x) => x.doctor === t.doctor);
  if (idx >= 0) consultTiers[idx] = t; else consultTiers.push(t);
  try { audit("admin", "consult_tier_upsert", { entity: "consult_tier", entityId: t.doctor }); } catch {}
}
export function removeConsultTier(doctor: string) {
  const idx = consultTiers.findIndex((x) => x.doctor === doctor);
  if (idx >= 0) consultTiers.splice(idx, 1);
  try { audit("admin", "consult_tier_remove", { entity: "consult_tier", entityId: doctor }); } catch {}
}

export function upsertProcedure(p: Procedure) {
  const idx = procedures.findIndex((x) => x.id === p.id);
  if (idx >= 0) procedures[idx] = p; else procedures.push(p);
  try { audit("admin", "procedure_upsert", { entity: "procedure", entityId: p.id, meta: { name: p.name, rate: p.rate } }); } catch {}
}
export function removeProcedure(id: string) {
  const idx = procedures.findIndex((x) => x.id === id);
  if (idx >= 0) procedures.splice(idx, 1);
  try { audit("admin", "procedure_remove", { entity: "procedure", entityId: id }); } catch {}
}

export function upsertDrug(d: Drug) {
  const idx = drugs.findIndex((x) => x.id === d.id);
  if (idx >= 0) drugs[idx] = d; else drugs.push(d);
  try { audit("admin", "drug_upsert", { entity: "drug", entityId: d.id, meta: { name: d.name } }); } catch {}
}
export function removeDrug(id: string) {
  const idx = drugs.findIndex((x) => x.id === id);
  if (idx >= 0) drugs.splice(idx, 1);
  try { audit("admin", "drug_remove", { entity: "drug", entityId: id }); } catch {}
}

export function upsertDistributor(d: Distributor) {
  const idx = distributors.findIndex((x) => x.id === d.id);
  if (idx >= 0) distributors[idx] = d; else distributors.push(d);
  try { audit("admin", "distributor_upsert", { entity: "distributor", entityId: d.id, meta: { name: d.name } }); } catch {}
}
export function removeDistributor(id: string) {
  const idx = distributors.findIndex((x) => x.id === id);
  if (idx >= 0) distributors.splice(idx, 1);
  try { audit("admin", "distributor_remove", { entity: "distributor", entityId: id }); } catch {}
}

/* ======================================================================
   Investment Partners
   ====================================================================== */

export type PartnerRole = "silent" | "active" | "managing";
export type PartnerTxnKind =
  | "capital_in"
  | "capital_out"
  | "profit_share"
  | "drawing"
  | "expense_reimb";
export type PartnerDocKind =
  | "pan"
  | "aadhaar"
  | "agreement"
  | "addendum"
  | "bank_proof"
  | "other";

export interface Partner {
  id: string;
  name: string;
  phone: string;
  email: string;
  pan: string;
  joinedAt: string; // ISO date
  capitalContribution: number; // running seed, ledger overrides
  sharePct: number; // 0-100
  role: PartnerRole;
  active: boolean;
  notes: string;
}
export interface PartnerTxn {
  id: string;
  partnerId: string;
  date: string; // ISO date
  kind: PartnerTxnKind;
  amount: number;
  method: "cash" | "bank" | "upi";
  reference: string;
  notes: string;
}
export interface PartnerDoc {
  id: string;
  partnerId: string;
  kind: PartnerDocKind;
  label: string;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string; // base64 data URL (mock backend)
  uploadedAt: string;
  uploadedBy: string;
  expiresAt?: string;
}

export const partners: Partner[] = [];
export const partnerTxns: PartnerTxn[] = [];
export const partnerDocs: PartnerDoc[] = [];

// Own hydration (arrays defined after _hydrate() ran)
const PARTNERS_STORE_KEY = "shifa.partners.v1";
function _hydratePartners() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PARTNERS_STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      partners?: Partner[];
      partnerTxns?: PartnerTxn[];
      partnerDocs?: PartnerDoc[];
    };
    if (Array.isArray(parsed.partners)) {
      partners.length = 0;
      for (const p of parsed.partners) partners.push(p);
    }
    if (Array.isArray(parsed.partnerTxns)) {
      partnerTxns.length = 0;
      for (const t of parsed.partnerTxns) partnerTxns.push(t);
    }
    if (Array.isArray(parsed.partnerDocs)) {
      partnerDocs.length = 0;
      for (const d of parsed.partnerDocs) partnerDocs.push(d);
    }
  } catch {
    /* ignore */
  }
}
function _persistPartners() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PARTNERS_STORE_KEY,
      JSON.stringify({ partners, partnerTxns, partnerDocs }),
    );
  } catch {
    /* quota */
  }
}
_hydratePartners();
if (typeof window !== "undefined") {
  window.setInterval(_persistPartners, 2000);
  window.addEventListener("beforeunload", _persistPartners);
}

let _partnerCounter = 0;
function nextPartnerId() {
  return `pt${Date.now().toString(36)}${(++_partnerCounter).toString(36)}`;
}

export function upsertPartner(p: Partner): Partner {
  const idx = partners.findIndex((x) => x.id === p.id);
  if (idx >= 0) partners[idx] = p;
  else partners.push(p);
  try {
    audit("admin", idx >= 0 ? "partner_update" : "partner_create", {
      entity: "partner",
      entityId: p.id,
      meta: { name: p.name, sharePct: p.sharePct },
    });
  } catch {}
  _persistPartners();
  return p;
}
export function createPartner(input: Omit<Partner, "id">): Partner {
  return upsertPartner({ ...input, id: nextPartnerId() });
}
export function removePartner(id: string) {
  const idx = partners.findIndex((x) => x.id === id);
  if (idx >= 0) partners.splice(idx, 1);
  // cascade
  for (let i = partnerTxns.length - 1; i >= 0; i--)
    if (partnerTxns[i].partnerId === id) partnerTxns.splice(i, 1);
  for (let i = partnerDocs.length - 1; i >= 0; i--)
    if (partnerDocs[i].partnerId === id) partnerDocs.splice(i, 1);
  try {
    audit("admin", "partner_remove", { entity: "partner", entityId: id });
  } catch {}
  _persistPartners();
}

export function addPartnerTxn(t: Omit<PartnerTxn, "id">): PartnerTxn {
  const entry: PartnerTxn = { ...t, id: nextPartnerId() };
  partnerTxns.unshift(entry);
  try {
    audit("admin", "partner_txn_add", {
      entity: "partner_txn",
      entityId: entry.id,
      meta: { partnerId: t.partnerId, kind: t.kind, amount: t.amount },
    });
  } catch {}
  _persistPartners();
  return entry;
}
export function removePartnerTxn(id: string) {
  const idx = partnerTxns.findIndex((x) => x.id === id);
  if (idx >= 0) partnerTxns.splice(idx, 1);
  try {
    audit("admin", "partner_txn_remove", { entity: "partner_txn", entityId: id });
  } catch {}
  _persistPartners();
}

export function addPartnerDoc(d: Omit<PartnerDoc, "id">): PartnerDoc {
  const entry: PartnerDoc = { ...d, id: nextPartnerId() };
  partnerDocs.unshift(entry);
  try {
    audit("admin", "partner_doc_add", {
      entity: "partner_doc",
      entityId: entry.id,
      meta: { partnerId: d.partnerId, kind: d.kind, fileName: d.fileName, size: d.size },
    });
  } catch {}
  _persistPartners();
  return entry;
}
export function removePartnerDoc(id: string) {
  const idx = partnerDocs.findIndex((x) => x.id === id);
  if (idx >= 0) partnerDocs.splice(idx, 1);
  try {
    audit("admin", "partner_doc_remove", { entity: "partner_doc", entityId: id });
  } catch {}
  _persistPartners();
}
export function renamePartnerDoc(id: string, label: string) {
  const d = partnerDocs.find((x) => x.id === id);
  if (!d) return;
  d.label = label;
  try {
    audit("admin", "partner_doc_rename", { entity: "partner_doc", entityId: id, meta: { label } });
  } catch {}
  _persistPartners();
}

/** Sum of ledger entries for a partner (capital_in + expense_reimb - capital_out - drawing - profit_share out). */
export function partnerBalance(partnerId: string): number {
  return partnerTxns
    .filter((t) => t.partnerId === partnerId)
    .reduce((sum, t) => {
      if (t.kind === "capital_in" || t.kind === "expense_reimb") return sum + t.amount;
      return sum - t.amount;
    }, 0);
}

/* ======================================================================
   Insurance & TPA Module
   ====================================================================== */

function _loadInsurance<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function _persistInsurance() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("shifa_insurance_plans", JSON.stringify(insurancePlans));
    localStorage.setItem("shifa_insurance_claims", JSON.stringify(insuranceClaims));
  } catch {}
}

const _seedInsPlans: InsurancePlan[] = [
  { id: "ip-1", providerName: "Star Health", policyNumber: "SH-2024-001234", tpaName: "Medi Assist", coveragePercent: 80, maxCover: 500000, status: "active" },
  { id: "ip-2", providerName: "ICICI Lombard", policyNumber: "IL-2024-005678", tpaName: "Paramount Health", coveragePercent: 70, maxCover: 300000, status: "active" },
  { id: "ip-3", providerName: "New India Assurance", policyNumber: "NIA-2023-009012", tpaName: "Raksha TPA", coveragePercent: 90, maxCover: 1000000, status: "active" },
];
const _seedInsClaims: InsuranceClaim[] = [];

export const insurancePlans: InsurancePlan[] = _loadInsurance("shifa_insurance_plans", _seedInsPlans);
export const insuranceClaims: InsuranceClaim[] = _loadInsurance("shifa_insurance_claims", _seedInsClaims);

let _insNextId = insurancePlans.length + insuranceClaims.length + 100;
function nextInsId(prefix: string) { return `${prefix}-${++_insNextId}`; }

export function findInsurancePlan(id?: string): InsurancePlan | undefined {
  if (!id) return undefined;
  return insurancePlans.find((p) => p.id === id);
}

export function addInsurancePlan(p: Omit<InsurancePlan, "id">): InsurancePlan {
  const entry: InsurancePlan = { ...p, id: nextInsId("ip") };
  insurancePlans.unshift(entry);
  audit("admin", "insurance_plan_add", { entity: "insurance_plan", entityId: entry.id, meta: { provider: p.providerName } });
  _persistInsurance();
  return entry;
}
export function updateInsurancePlan(id: string, updates: Partial<InsurancePlan>) {
  const p = insurancePlans.find((x) => x.id === id);
  if (p) Object.assign(p, updates);
  audit("admin", "insurance_plan_update", { entity: "insurance_plan", entityId: id });
  _persistInsurance();
}
export function removeInsurancePlan(id: string) {
  const idx = insurancePlans.findIndex((x) => x.id === id);
  if (idx >= 0) insurancePlans.splice(idx, 1);
  audit("admin", "insurance_plan_remove", { entity: "insurance_plan", entityId: id });
  _persistInsurance();
}

export function addInsuranceClaim(c: Omit<InsuranceClaim, "id">): InsuranceClaim {
  const entry: InsuranceClaim = { ...c, id: nextInsId("ic") };
  insuranceClaims.unshift(entry);
  audit("front_office", "insurance_claim_submit", { entity: "insurance_claim", entityId: entry.id, meta: { invoiceId: c.invoiceId, amount: c.claimAmount } });
  _persistInsurance();
  return entry;
}
export function updateInsuranceClaim(id: string, updates: Partial<InsuranceClaim>) {
  const c = insuranceClaims.find((x) => x.id === id);
  if (c) Object.assign(c, updates);
  audit("admin", "insurance_claim_update", { entity: "insurance_claim", entityId: id, meta: { status: updates.status } });
  _persistInsurance();
}

/* ======================================================================
   Inventory Auto-Reorder & Expiry Helpers
   ====================================================================== */

/** Returns drugs grouped with batch-level expiry detail for the pharmacy expiry view */
export interface DrugExpiryAlert {
  drug: Drug;
  daysToExpiry: number;
  severity: "expired" | "critical" | "warning" | "safe";
}
export function getExpiryAlerts(thresholdDays: number = 90): DrugExpiryAlert[] {
  const now = Date.now();
  return drugs
    .map((d) => {
      const exp = new Date(d.expiry).getTime();
      const daysToExpiry = Math.floor((exp - now) / 864e5);
      const severity: DrugExpiryAlert["severity"] =
        daysToExpiry < 0 ? "expired" :
        daysToExpiry <= 30 ? "critical" :
        daysToExpiry <= thresholdDays ? "warning" : "safe";
      return { drug: d, daysToExpiry, severity };
    })
    .filter((a) => a.severity !== "safe")
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

/** Generate a draft purchase order for all items below reorder level */
export interface AutoReorderItem {
  drug: Drug;
  deficit: number;
  suggestedQty: number;
  estimatedCost: number;
}
export function generateAutoReorderList(): AutoReorderItem[] {
  return drugs
    .filter((d) => d.stock <= d.reorderLevel)
    .map((d) => {
      const deficit = Math.max(0, d.reorderLevel - d.stock);
      // Suggest ordering 2x deficit to build buffer
      const suggestedQty = deficit * 2 || 10;
      const estimatedCost = suggestedQty * d.mrp * 0.7; // ~30% margin estimate
      return { drug: d, deficit, suggestedQty, estimatedCost };
    })
    .sort((a, b) => a.drug.name.localeCompare(b.drug.name));
}
