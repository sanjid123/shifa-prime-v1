import { useMemo, useState } from "react";
import { Printer, Download, FileText, Pill, FlaskConical, UserCog, Stethoscope, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PatientLookup } from "@/components/patient-lookup";
import { BillPrintPreview } from "@/components/bill-print-preview";
import {
  invoices, samples, prescriptions, drugs, invoiceTotal, patientSummary,
  type Patient, type Invoice, type Sample, type Prescription,
} from "@/lib/mock/data";


type TimelineItem =
  | { kind: "invoice"; ts: string; inv: Invoice }
  | { kind: "sample"; ts: string; sample: Sample }
  | { kind: "rx"; ts: string; rx: Prescription };

const DEPT_META: Record<Invoice["department"], { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  front_office: { label: "Front Office", icon: UserCog, tint: "bg-slate-500/15 text-slate-700 border-slate-500/30" },
  lab: { label: "Laboratory", icon: FlaskConical, tint: "bg-sky-500/15 text-sky-700 border-sky-500/30" },
  pharmacy: { label: "Pharmacy", icon: Pill, tint: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30" },
};

export function PatientHistory({ initialPatient }: { initialPatient?: Patient | null }) {
  const [lookup, setLookup] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(initialPatient ?? null);
  const [printInvId, setPrintInvId] = useState<string | null>(null);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!patient) return [];
    const items: TimelineItem[] = [];
    invoices.filter((i) => i.patientId === patient.id).forEach((inv) => items.push({ kind: "invoice", ts: inv.date, inv }));
    samples.filter((s) => s.patientId === patient.id).forEach((s) => items.push({ kind: "sample", ts: s.createdAt, sample: s }));
    prescriptions.filter((r) => r.patientId === patient.id).forEach((r) => items.push({ kind: "rx", ts: r.createdAt, rx: r }));
    return items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }, [patient]);

  const totals = useMemo(() => {
    if (!patient) return { visits: 0, billed: 0, paid: 0, outstanding: 0 };
    const invs = invoices.filter((i) => i.patientId === patient.id);
    let billed = 0, paid = 0, outstanding = 0;
    invs.forEach((i) => { const t = invoiceTotal(i).total; billed += t; if (i.paid) paid += t; else outstanding += t; });
    return { visits: invs.length, billed, paid, outstanding };
  }, [patient]);

  const exportCsv = () => {
    if (!patient) return;
    const rows = [["Date", "Type", "Module", "Reference", "Details", "Amount", "Status"]];
    timeline.forEach((it) => {
      if (it.kind === "invoice") {
        const t = invoiceTotal(it.inv);
        rows.push([it.ts, "Invoice", DEPT_META[it.inv.department].label, it.inv.id,
          it.inv.lines.map((l) => `${l.desc} x${l.qty}`).join(" | "),
          t.total.toFixed(2), it.inv.paid ? "Paid" : "Unpaid"]);
      } else if (it.kind === "sample") {
        rows.push([it.ts, "Lab Sample", "Laboratory", it.sample.barcode,
          it.sample.tests.map((t) => `${t.code}${t.value != null ? `=${t.value}` : ""}`).join(" | "),
          "", it.sample.status]);
      } else {
        rows.push([it.ts, "Prescription", "Pharmacy", it.rx.id,
          it.rx.items.map((i) => { const d = drugs.find((x) => x.id === i.drugId); return `${d?.name ?? i.drugId} · ${i.dose} x${i.qty}`; }).join(" | "),
          "", it.rx.dispensed ? "Dispensed" : "Pending"]);
      }
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `patient-${patient.mrn}-history.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">Patient 360 · Visit History</div>
          <Button size="sm" variant="outline" onClick={() => setLookup(true)}><Search className="mr-1 h-4 w-4" />Find Patient</Button>
        </div>
        {patient ? (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-base font-semibold">{patient.name}
                <Badge variant="outline" className="font-mono">{patient.mrn}</Badge>
                <Badge variant="outline">{patient.age}{patient.gender}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                📱 {patient.phone}{patient.address ? ` · ${patient.address}` : ""}
                {patient.allergies.length > 0 && <span className="ml-2 font-semibold text-destructive">⚠ Allergies: {patient.allergies.join(", ")}</span>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center md:min-w-[26rem]">
              <Stat label="Visits" value={String(totals.visits)} />
              <Stat label="Billed" value={`₹${totals.billed.toFixed(0)}`} />
              <Stat label="Paid" value={`₹${totals.paid.toFixed(0)}`} tint="text-emerald-600" />
              <Stat label="Due" value={`₹${totals.outstanding.toFixed(0)}`} tint="text-amber-600" />
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Search a patient by MRN, mobile or name to view their complete cross-module history.
          </div>
        )}
      </div>

      {patient && <PatientSummaryStrip patientId={patient.id} />}

      {patient && (

        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <div className="text-sm font-semibold">Timeline · <span className="text-muted-foreground">{timeline.length} events</span></div>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
          </div>
          {timeline.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No visits recorded for this patient yet.</div>
          ) : (
            <ul className="divide-y">
              {timeline.map((it, idx) => (
                <li key={idx} className="grid grid-cols-[8rem_1fr_auto] items-start gap-3 p-3 text-sm">
                  <div className="text-xs text-muted-foreground">
                    <div>{new Date(it.ts).toLocaleDateString()}</div>
                    <div className="text-[10px]">{new Date(it.ts).toLocaleTimeString()}</div>
                  </div>
                  {it.kind === "invoice" ? <InvoiceRow inv={it.inv} /> : it.kind === "sample" ? <SampleRow s={it.sample} /> : <RxRow r={it.rx} />}
                  <div>
                    {it.kind === "invoice" && (
                      <Button size="sm" variant="outline" onClick={() => setPrintInvId(it.inv.id)}>
                        <Printer className="mr-1 h-3 w-3" />Reprint
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <PatientLookup open={lookup} onClose={() => setLookup(false)} onPick={(p) => { setPatient(p); setLookup(false); }} />
      <BillPrintPreview invoiceId={printInvId} open={!!printInvId} onClose={() => setPrintInvId(null)} />
    </div>
  );
}

function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base font-bold ${tint ?? ""}`}>{value}</div>
    </div>
  );
}

function PatientSummaryStrip({ patientId }: { patientId: string }) {
  const s = patientSummary(patientId);
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : "-");
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-3 md:grid-cols-4">
      <SummaryTile icon={Clock} label="Total Visits" value={String(s.totalVisits)} sub={s.lastVisitAt ? `Last ${fmt(s.lastVisitAt)}` : "No visits yet"} tint="text-indigo-600 bg-indigo-500/10" />
      <SummaryTile icon={Stethoscope} label="Last Doctor" value={s.lastDoctor ?? "-"} sub={s.lastVisitAt ? fmt(s.lastVisitAt) : ""} tint="text-emerald-600 bg-emerald-500/10" />
      <SummaryTile icon={FlaskConical} label="Last Lab" value={s.lastLabName ?? "-"} sub={fmt(s.lastLabAt)} tint="text-sky-600 bg-sky-500/10" />
      <SummaryTile icon={Pill} label="Last Medicine" value={s.lastMed ?? "-"} sub={fmt(s.lastMedAt)} tint="text-orange-600 bg-orange-500/10" />
    </div>
  );
}

function SummaryTile({
  icon: Icon, label, value, sub, tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string; tint: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className={`mb-1 grid h-7 w-7 place-items-center rounded-md ${tint}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
      {sub && <div className="truncate text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function InvoiceRow({ inv }: { inv: Invoice }) {
  const meta = DEPT_META[inv.department];
  const Icon = meta.icon;
  const t = invoiceTotal(inv);
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={meta.tint}><Icon className="mr-1 h-3 w-3" />{meta.label}</Badge>
        <span className="font-mono text-xs">{inv.id}</span>
        {inv.token != null && <span className="text-xs text-muted-foreground">Token #{inv.token}</span>}
        {inv.doctorName && <span className="text-xs text-muted-foreground">· {inv.doctorName}</span>}
        <Badge className={inv.paid ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : "bg-amber-500/15 text-amber-700 border-amber-500/30"} variant="outline">
          {inv.paid ? "Paid" : "Unpaid"}
        </Badge>
        <span className="ml-auto font-mono text-sm font-semibold">₹{t.total.toFixed(2)}</span>
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground">
        {inv.lines.map((l) => `${l.desc} × ${l.qty}`).join(" · ")}
      </div>
    </div>
  );
}

function SampleRow({ s }: { s: Sample }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-sky-500/15 text-sky-700 border-sky-500/30"><FlaskConical className="mr-1 h-3 w-3" />Lab</Badge>
        <span className="font-mono text-xs">{s.barcode}</span>
        {s.stat && <Badge variant="destructive">STAT</Badge>}
        <Badge variant="outline">{s.status}</Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {s.tests.map((t) => <span key={t.code} className="mr-2">{t.code}{t.value != null ? ` = ${t.value}${t.unit}` : ""}</span>)}
      </div>
    </div>
  );
}

function RxRow({ r }: { r: Prescription }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-indigo-500/15 text-indigo-700 border-indigo-500/30"><Pill className="mr-1 h-3 w-3" />Rx</Badge>
        <span className="font-mono text-xs">{r.id}</span>
        <span className="text-xs text-muted-foreground">{r.doctor}</span>
        <Badge variant="outline">{r.dispensed ? "Dispensed" : "Pending"}</Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {r.items.map((i, idx) => { const d = drugs.find((x) => x.id === i.drugId); return <span key={idx} className="mr-2">{d?.name ?? i.drugId} · {i.dose} × {i.qty}</span>; })}
      </div>
    </div>
  );
}

// referenced only to keep tree-shaker from removing icons in some builds
export const __hist_icons = { Stethoscope, FileText };
