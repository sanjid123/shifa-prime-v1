import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Stethoscope, FlaskConical, Pill, CheckCircle2, Users, Clock, ClipboardList,
  Activity, Search, HeartPulse,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PatientHistory } from "@/components/patient-history";

import {
  queue, findPatient, audit, persistNow, labOrders, nextLabOrderId,
  patients, invoices, invoiceTotal,
  type QueueStation, type Patient,
} from "@/lib/mock/data";

type DocTab = "dashboard" | "queue" | "patients";

export const Route = createFileRoute("/app/doctor")({
  validateSearch: (s: Record<string, unknown>): { tab: DocTab } => {
    const allowed: DocTab[] = ["dashboard", "queue", "patients"];
    const t = allowed.includes(s.tab as DocTab) ? (s.tab as DocTab) : "dashboard";
    return { tab: t };
  },
  component: DoctorEMR,
});

const TAB_TITLE: Record<DocTab, { title: string; subtitle: string }> = {
  dashboard: { title: "Doctor Dashboard", subtitle: "Today's queue, at a glance" },
  queue: { title: "Consultation Queue", subtitle: "Diagnose · prescribe · route" },
  patients: { title: "Patient Search", subtitle: "Look up any patient's full history" },
};

function DoctorEMR() {
  const { tab } = Route.useSearch() as { tab: DocTab };
  const meta = TAB_TITLE[tab];


  return (
    <div className="p-4 lg:p-6">
      <section className="relative mb-4 overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold leading-tight">{meta.title}</div>
            <div className="truncate text-xs text-white/80">{meta.subtitle}</div>
          </div>
        </div>
      </section>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "queue" && <QueueTab />}
      {tab === "patients" && <PatientsTab />}
    </div>
  );
}

/* ============ Dashboard ============ */
function DashboardTab() {
  const nav = useNavigate();
  const today = new Date().toDateString();
  const active = queue.filter((q) => q.status !== "cancelled");
  const waiting = active.filter((q) => (q.station ?? "waiting") === "waiting").length;
  const withDoc = active.filter((q) => q.station === "with_doctor").length;
  const toLab = active.filter((q) => q.station === "sent_to_lab").length;
  const toRx = active.filter((q) => q.station === "sent_to_pharmacy").length;
  const done = active.filter((q) => q.station === "done").length;
  const todayInvs = invoices.filter((i) => new Date(i.date).toDateString() === today);
  const consultRevenue = todayInvs
    .filter((i) => i.department === "front_office")
    .reduce((s, i) => s + invoiceTotal(i).total, 0);

  const kpis = [
    { label: "In Queue", value: active.length, icon: Users, tint: "text-indigo-600 bg-indigo-500/10" },
    { label: "Waiting", value: waiting, icon: Clock, tint: "text-amber-600 bg-amber-500/10" },
    { label: "With Doctor", value: withDoc, icon: Stethoscope, tint: "text-emerald-600 bg-emerald-500/10" },
    { label: "Sent to Lab", value: toLab, icon: FlaskConical, tint: "text-sky-600 bg-sky-500/10" },
    { label: "Sent to Pharmacy", value: toRx, icon: Pill, tint: "text-orange-600 bg-orange-500/10" },
    { label: "Completed", value: done, icon: CheckCircle2, tint: "text-teal-600 bg-teal-500/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-3">
            <div className={`grid h-9 w-9 place-items-center rounded-lg ${k.tint}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{k.value}</div>
            <div className="text-[11px] text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600" />
            <div className="text-sm font-semibold">Next in queue</div>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => nav({ to: "/app/doctor", search: { tab: "queue" } })}>
              Open queue →
            </Button>
          </div>
          {active.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              No patients right now.
            </div>
          ) : (
            <ul className="divide-y">
              {active.slice(0, 5).map((q) => {
                const p = findPatient(q.patientId);
                return (
                  <li key={q.id} className="flex items-center gap-3 py-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">{q.token}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p?.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{p?.mrn} · {q.doctor}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{q.station ?? "waiting"}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-emerald-600" />
            <div className="text-sm font-semibold">Today</div>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Consultation revenue" value={`₹${Math.round(consultRevenue).toLocaleString("en-IN")}`} />
            <Row label="Bills issued" value={todayInvs.length} />
            <Row label="Registered patients" value={patients.length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b pb-1.5 text-xs last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/* ============ Queue ============ */
const STATION_LABEL: Record<QueueStation, string> = {
  waiting: "Waiting",
  with_doctor: "With Doctor",
  sent_to_lab: "Sent to Lab",
  sent_to_pharmacy: "Sent to Pharmacy",
  done: "Done",
};
const STATION_CLS: Record<QueueStation, string> = {
  waiting: "bg-status-waiting/15 text-status-waiting border-status-waiting/40",
  with_doctor: "bg-primary/10 text-primary border-primary/30",
  sent_to_lab: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
  sent_to_pharmacy: "bg-status-checkedin/15 text-status-checkedin border-status-checkedin/40",
  done: "bg-muted text-muted-foreground border-border",
};

function QueueTab() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const active = queue.filter((q) => q.status !== "cancelled");

  const setStation = (id: string, station: QueueStation, extra?: Partial<{ labRequired: boolean; diagnosis: string; prescription: string }>) => {
    const q = queue.find((x) => x.id === id);
    if (!q) return;
    q.station = station;
    if (extra?.labRequired !== undefined) q.labRequired = extra.labRequired;
    if (extra?.diagnosis !== undefined) q.diagnosis = extra.diagnosis;
    if (extra?.prescription !== undefined) q.prescription = extra.prescription;
    persistNow();
    audit("front_office", "doctor_route", { entity: "queue", entityId: id, meta: { station, labRequired: extra?.labRequired } });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Active queue</h2>
        <Badge variant="outline">{active.length}</Badge>
        <div className="ml-auto text-xs text-muted-foreground">Diagnose → mark <b>Lab required?</b> → route</div>
      </div>

      {active.length === 0 && (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No patients in queue.</div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {active.map((q) => {
          const p = findPatient(q.patientId);
          const station: QueueStation = q.station ?? (q.status === "checkedin" ? "with_doctor" : "waiting");
          const isDone = station === "done" || station === "sent_to_lab" || station === "sent_to_pharmacy";
          return (
            <div key={q.id} className="space-y-3 rounded-xl border bg-card p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-start">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-xl font-bold text-primary">{q.token}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p?.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p?.mrn} · {q.doctor} · {p?.phone}</div>
                    {p?.allergies?.length ? (
                      <div className="mt-1 text-[11px] text-destructive">Allergies: {p.allergies.join(", ")}</div>
                    ) : null}
                  </div>
                </div>
                <Badge className={`${STATION_CLS[station]} shrink-0`}>{STATION_LABEL[station]}</Badge>
              </div>

              {!isDone && (
                <DoctorForm
                  initial={{ diagnosis: q.diagnosis ?? "", prescription: q.prescription ?? "", labRequired: q.labRequired ?? false }}
                  onSendToLab={(d) => {
                    setStation(q.id, "sent_to_lab", { ...d, labRequired: true });
                    const ids = nextLabOrderId();
                    labOrders.unshift({
                      id: ids.id, barcode: ids.barcode, createdAt: new Date().toISOString(),
                      source: "doctor", queueId: q.id, patientId: q.patientId,
                      testCodes: [], pkgIds: [], status: "pending",
                      notes: d.diagnosis || undefined,
                    });
                    persistNow();
                    audit("front_office", "lab_order_create", { entity: "lab_order", entityId: ids.id, meta: { source: "doctor" } });
                    toast.success(`${p?.name} → Lab · ${ids.id}`);
                  }}
                  onSendToPharmacy={(d) => { setStation(q.id, "sent_to_pharmacy", { ...d, labRequired: false }); toast.success(`${p?.name} → Pharmacy`); }}
                  onComplete={(d) => { setStation(q.id, "done", { ...d, labRequired: false }); toast.success(`${p?.name} · consultation done`); }}
                />
              )}
              {isDone && (q.diagnosis || q.prescription) && (
                <div className="rounded-md border bg-muted/30 p-2 text-xs">
                  {q.diagnosis && <div><b>Dx:</b> {q.diagnosis}</div>}
                  {q.prescription && <div><b>Rx:</b> {q.prescription}</div>}
                </div>
              )}
              {isDone && (
                <Button size="sm" variant="ghost" onClick={() => setStation(q.id, "with_doctor")}>Re-open</Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DoctorForm({
  initial, onSendToLab, onSendToPharmacy, onComplete,
}: {
  initial: { diagnosis: string; prescription: string; labRequired: boolean };
  onSendToLab: (d: { diagnosis: string; prescription: string }) => void;
  onSendToPharmacy: (d: { diagnosis: string; prescription: string }) => void;
  onComplete: (d: { diagnosis: string; prescription: string }) => void;
}) {
  const [diagnosis, setDx] = useState(initial.diagnosis);
  const [prescription, setRx] = useState(initial.prescription);
  const [lab, setLab] = useState<boolean | null>(initial.labRequired ? true : null);
  const data = { diagnosis, prescription };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Textarea placeholder="Diagnosis / clinical notes" value={diagnosis} onChange={(e) => setDx(e.target.value)} className="min-h-[70px] text-sm" />
        <Textarea placeholder="Prescription (medicines, dose)" value={prescription} onChange={(e) => setRx(e.target.value)} className="min-h-[70px] text-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-semibold text-muted-foreground">Lab test required?</div>
        <div className="flex overflow-hidden rounded-md border">
          <button onClick={() => setLab(true)} className={`px-3 py-1 text-xs font-semibold ${lab === true ? "bg-amber-500 text-white" : "hover:bg-accent"}`}>Yes</button>
          <button onClick={() => setLab(false)} className={`px-3 py-1 text-xs font-semibold ${lab === false ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>No</button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {lab === true && (
            <Button size="sm" onClick={() => onSendToLab(data)}><FlaskConical className="mr-1 h-3.5 w-3.5" />Send to Lab</Button>
          )}
          {lab === false && (
            <>
              <Button size="sm" onClick={() => onSendToPharmacy(data)}><Pill className="mr-1 h-3.5 w-3.5" />Send to Pharmacy</Button>
              <Button size="sm" variant="outline" onClick={() => onComplete(data)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />No Meds · Done</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ Patients ============ */
function PatientsTab() {
  const [selected, setSelected] = useState<Patient | null>(null);
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients.slice(0, 10);
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.mrn.toLowerCase().includes(s) ||
        (p.phone || "").includes(s),
    ).slice(0, 20);
  }, [q]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="rounded-xl border bg-card">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, MRN or phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ul className="max-h-[70vh] divide-y overflow-y-auto">
          {results.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelected(p)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${selected?.id === p.id ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{p.mrn} · {p.phone}</div>
                </div>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="p-4 text-center text-xs text-muted-foreground">No matches</li>
          )}
        </ul>
      </div>
      <div className="min-w-0">
        {selected ? (
          <PatientHistory initialPatient={selected} />
        ) : (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Pick a patient from the list to see their full history.
          </div>
        )}
      </div>

    </div>
  );
}
