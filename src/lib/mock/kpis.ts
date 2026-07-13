// Derived analytics for the Admin dashboard.
import { patients, invoices, queue, invoiceTotal, findPatient } from "./data";

export interface DailySnapshot {
  totalPatients: number;
  newPatients: number;
  repeatPatients: number;
  totalRevenue: number;
  consultRevenue: number;
  labRevenue: number;
  pharmacyRevenue: number;
  cashCollection: number;
  upiCollection: number;
  cardCollection: number;
  creditCollection: number;
}

export interface FinancialKPI {
  grossRevenue: number;
  netRevenue: number;
  todaysProfit: number;
  grossMargin: number;
  pharmacyMargin: number;
  labMargin: number;
  collectionEfficiency: number;
  arpp: number;
  avgBillValue: number;
  revenuePerDoctor: number;
}

export interface PatientAnalytics {
  opVisits: number;
  repeatVisitPct: number;
  newPatientPct: number;
  doctorWise: { name: string; count: number }[];
  deptWise: { name: string; count: number }[];
  avgWaitingMin: number;
  followUpRate: number;
}

// Deterministic split of collections by mode based on invoice id hash (mock).
function modeFor(id: string): "cash" | "upi" | "card" | "credit" {
  const s = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const m = s % 4;
  return (["cash", "upi", "card", "credit"] as const)[m];
}

export function dailySnapshot(): DailySnapshot {
  let consult = 0, lab = 0, pharm = 0, total = 0;
  let cash = 0, upi = 0, card = 0, credit = 0;
  const seenPatients = new Set<string>();
  for (const inv of invoices) {
    const t = invoiceTotal(inv);
    total += t.total;
    if (inv.department === "front_office") consult += t.total;
    else if (inv.department === "lab") lab += t.total;
    else if (inv.department === "pharmacy") pharm += t.total;
    seenPatients.add(inv.patientId);
    if (inv.paid) {
      const m = modeFor(inv.id);
      if (m === "cash") cash += t.total;
      else if (m === "upi") upi += t.total;
      else if (m === "card") card += t.total;
      else credit += t.total;
    }
  }
  const totalPatients = seenPatients.size;
  const repeat = [...seenPatients].filter((pid) => invoices.filter((i) => i.patientId === pid).length > 1).length;
  return {
    totalPatients,
    newPatients: totalPatients - repeat,
    repeatPatients: repeat,
    totalRevenue: total,
    consultRevenue: consult,
    labRevenue: lab,
    pharmacyRevenue: pharm,
    cashCollection: cash,
    upiCollection: upi,
    cardCollection: card,
    creditCollection: credit,
  };
}

export function financialKPIs(): FinancialKPI {
  const snap = dailySnapshot();
  const gross = snap.totalRevenue;
  const paid = invoices.filter((i) => i.paid).reduce((s, i) => s + invoiceTotal(i).total, 0);
  const net = paid;
  // Approx margins (mock): consult 80%, lab 55%, pharmacy 22%.
  const consultProfit = snap.consultRevenue * 0.8;
  const labProfit = snap.labRevenue * 0.55;
  const pharmProfit = snap.pharmacyRevenue * 0.22;
  const profit = consultProfit + labProfit + pharmProfit;
  const doctors = new Set(invoices.filter((i) => i.doctorName).map((i) => i.doctorName!));
  return {
    grossRevenue: gross,
    netRevenue: net,
    todaysProfit: Math.round(profit),
    grossMargin: gross > 0 ? Math.round((profit / gross) * 100) : 0,
    pharmacyMargin: 22,
    labMargin: 55,
    collectionEfficiency: gross > 0 ? Math.round((paid / gross) * 100) : 0,
    arpp: snap.totalPatients > 0 ? Math.round(gross / snap.totalPatients) : 0,
    avgBillValue: invoices.length > 0 ? Math.round(gross / invoices.length) : 0,
    revenuePerDoctor: doctors.size > 0 ? Math.round(snap.consultRevenue / doctors.size) : snap.consultRevenue,
  };
}

export function patientAnalytics(): PatientAnalytics {
  const opVisits = invoices.filter((i) => i.department === "front_office").length;
  const seen = new Set<string>();
  const repeatSet = new Set<string>();
  for (const inv of invoices) {
    if (seen.has(inv.patientId)) repeatSet.add(inv.patientId);
    seen.add(inv.patientId);
  }
  const repeatPct = seen.size ? Math.round((repeatSet.size / seen.size) * 100) : 0;
  const doctorMap = new Map<string, Set<string>>();
  for (const inv of invoices) {
    if (!inv.doctorName) continue;
    if (!doctorMap.has(inv.doctorName)) doctorMap.set(inv.doctorName, new Set());
    doctorMap.get(inv.doctorName)!.add(inv.patientId);
  }
  const doctorWise = [...doctorMap.entries()].map(([name, set]) => ({ name, count: set.size }));
  const deptMap = new Map<string, Set<string>>();
  for (const inv of invoices) {
    const k = inv.department;
    if (!deptMap.has(k)) deptMap.set(k, new Set());
    deptMap.get(k)!.add(inv.patientId);
  }
  const deptWise = [...deptMap.entries()].map(([name, set]) => ({ name, count: set.size }));
  return {
    opVisits,
    repeatVisitPct: repeatPct,
    newPatientPct: 100 - repeatPct,
    doctorWise,
    deptWise,
    avgWaitingMin: 14,
    followUpRate: 32,
  };
}

/* Charts data */
export function genderSplit() {
  const m = patients.filter((p) => p.gender === "M").length;
  const f = patients.filter((p) => p.gender === "F").length;
  return [
    { name: "Male", value: m },
    { name: "Female", value: f },
  ];
}

export function ageBuckets() {
  const buckets = { Child: 0, Teen: 0, Adult: 0, Senior: 0 };
  for (const p of patients) {
    if (p.age <= 12) buckets.Child++;
    else if (p.age <= 19) buckets.Teen++;
    else if (p.age <= 59) buckets.Adult++;
    else buckets.Senior++;
  }
  return Object.entries(buckets).map(([name, value]) => ({ name, value }));
}

export function revenueSplit() {
  const snap = dailySnapshot();
  return [
    { name: "Consultation", value: Math.round(snap.consultRevenue) },
    { name: "Laboratory", value: Math.round(snap.labRevenue) },
    { name: "Pharmacy", value: Math.round(snap.pharmacyRevenue) },
  ];
}

export function collectionsByMode() {
  const snap = dailySnapshot();
  return [
    { name: "Cash", value: snap.cashCollection },
    { name: "UPI", value: snap.upiCollection },
    { name: "Card", value: snap.cardCollection },
    { name: "Credit", value: snap.creditCollection },
  ];
}

export function queueLive() {
  return queue.filter((q) => q.status === "waiting" || q.status === "checkedin").map((q) => ({
    ...q, patient: findPatient(q.patientId),
  }));
}
