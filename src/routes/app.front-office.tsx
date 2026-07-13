import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { UserPlus, Ticket, Plus, CalendarDays, Users, Stethoscope, ClipboardList, FileText, Search, Trash2, Save, Printer, History, Lock, Loader2, ShieldCheck, ChevronLeft, ChevronRight, Monitor, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PatientLookup } from "@/components/patient-lookup";
import { ReportView } from "@/components/report-view";
import { BillPrintPreview } from "@/components/bill-print-preview";
import type { ReportColumn } from "@/lib/reports/export";
import { verifyAdmin } from "@/lib/roles";
import {
  patients, queue as seedQueue, invoices,
  doctors as seedDoctors, appointments as seedAppts, DAYS,
  procedures as seedProcedures, crossConsults, nextMrn, findPatient, invoiceTotal,
  BILLING_ACCOUNT_LABEL, audit, notify, persistNow,
  insurancePlans, findInsurancePlan,
  type Patient, type QueueEntry, type Doctor, type Appointment, type AppointmentStatus,
  type Invoice, type BillingAccount, type InvoiceLine, type Procedure,
} from "@/lib/mock/data";
import { FrontOfficeVisitsTab } from "@/components/front-office-visits";



type FoTab = "patients" | "visits" | "appointments" | "crossconsult" | "procedure" | "doctors" | "reports";
export const Route = createFileRoute("/app/front-office")({
  validateSearch: (s: Record<string, unknown>): { tab: FoTab } => {
    const raw = (s.tab as string) ?? "patients";
    // Legacy "booking" tab has been replaced by "visits" - silently redirect.
    const tab = (raw === "booking" ? "visits" : raw) as FoTab;
    return { tab };
  },
  component: FrontOffice,
});


const apptMeta: Record<AppointmentStatus, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40" },
  waiting:   { label: "Waiting",   cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40" },
  checkedin: { label: "Checked In", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40" },
  cancelled: { label: "Cancelled", cls: "bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/40 line-through" },
  noshow:    { label: "No-show",   cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40" },
};

const SLOTS = (() => {
  const out: string[] = [];
  for (let h = 8; h < 20; h++) for (let m = 0; m < 60; m += 15) out.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
  return out;
})();

// Format an internal "HH:mm" (24h) to a friendly 12-hour string like "8:30 AM".
export function to12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

const TAB_META: Record<string, { label: string; hint: string }> = {
  patients: { label: "Patient Registration", hint: "Register a new patient · duplicate check on Mobile / Name+Age" },
  visits: { label: "New Visit", hint: "Patient → Department → Doctor → Fee → Token" },
  appointments: { label: "Appointments", hint: "Calendar · drag to move" },
  crossconsult: { label: "Cross Consultation", hint: "Add second opinion" },
  procedure: { label: "Procedure Bill", hint: "Bill for procedures" },
  doctors: { label: "Doctor Registration", hint: "Manage doctors list" },
  reports: { label: "Reports", hint: "Export CSV · Excel · PDF" },
};


function FrontOffice() {
  const [docs, setDocs] = useState<Doctor[]>(seedDoctors);
  const [pts, setPts] = useState<Patient[]>(patients);
  const [q, setQ] = useState<QueueEntry[]>(seedQueue);
  const [appts, setAppts] = useState<Appointment[]>(seedAppts);
  const [invs, setInvs] = useState<Invoice[]>(invoices);
  const { tab } = Route.useSearch();

  const todayStr = new Date().toDateString();
  const stats = useMemo(() => {
    const todayRegs = pts.filter((p) => new Date(p.createdAt).toDateString() === todayStr).length;
    const todayBookings = appts.filter((a) => a.status !== "cancelled").length;
    const waiting = q.filter((x) => x.status === "waiting").length;
    const todayCollections = invs
      .filter((i) => i.department === "front_office" && new Date(i.date).toDateString() === todayStr && i.paid)
      .reduce((s, i) => {
        const sub = i.lines.reduce((ss, l) => ss + l.qty * l.rate, 0);
        return s + Math.max(0, sub - (i.discount || 0));
      }, 0);
    return { todayRegs, todayBookings, waiting, todayCollections };
  }, [pts, appts, q, invs, todayStr]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Today at a glance */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Today's Registrations" value={stats.todayRegs} tone="sky" icon={<UserPlus className="h-4 w-4" />} />
        <StatTile label="Today's Bookings" value={stats.todayBookings} tone="emerald" icon={<CalendarDays className="h-4 w-4" />} />
        <StatTile label="Waiting" value={stats.waiting} tone="amber" icon={<Users className="h-4 w-4" />} />
        <StatTile label="Today's Collections" value={`₹${stats.todayCollections.toLocaleString("en-IN")}`} tone="violet" icon={<FileText className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{TAB_META[tab].label}</span>
          <span className="text-xs text-muted-foreground">· {TAB_META[tab].hint}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open("/queue-display", "_blank")}
            className="h-8 gap-1"
          >
            <Monitor className="h-3.5 w-3.5" />
            Open TV Display
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              // Find the first patient in queue who is "waiting"
              const nextQ = q.find((x) => x.status === "waiting" && (x.station === "waiting" || !x.station));
              if (nextQ) {
                nextQ.station = "with_doctor";
                persistNow();
                setQ([...seedQueue]);
                toast.success(`Token T${nextQ.token} called next!`);
                audit("front_office", "queue_call_next", { entity: "queue", entityId: nextQ.id, meta: { token: nextQ.token } });
              } else {
                toast.info("No waiting patients in queue.");
              }
            }}
            className="h-8 gap-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Call Next Patient
          </Button>
        </div>
      </div>

      <Tabs value={tab} className="w-full">
        <TabsList className="hidden" />
        <TabsContent value="patients" className="mt-0">
          <PatientRegistrationTab patients={pts} setPatients={setPts} />
        </TabsContent>
        <TabsContent value="visits" className="mt-0">
          <FrontOfficeVisitsTab />
        </TabsContent>
        <TabsContent value="appointments" className="mt-0">
          <AppointmentsTab doctors={docs.filter((d) => d.active)} appts={appts} setAppts={setAppts} />
        </TabsContent>

        <TabsContent value="crossconsult" className="mt-0">
          <CrossConsultTab doctors={docs.filter((d) => d.active)} invoices={invs} setInvoices={setInvs} />
        </TabsContent>
        <TabsContent value="procedure" className="mt-0">
          <ProcedureBillTab invoices={invs} setInvoices={setInvs} />
        </TabsContent>
        <TabsContent value="doctors" className="mt-0">
          <DoctorsTab doctors={docs} setDoctors={setDocs} />
        </TabsContent>
        <TabsContent value="reports" className="mt-0">
          <ReportsTab invoices={invs} appts={appts} doctors={docs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const TONE_CLS: Record<string, string> = {
  sky: "from-sky-500/10 to-sky-500/5 border-sky-500/30 text-sky-700 dark:text-sky-300",
  emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  amber: "from-amber-500/10 to-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-300",
  violet: "from-violet-500/10 to-violet-500/5 border-violet-500/30 text-violet-700 dark:text-violet-300",
};
function StatTile({ label, value, tone, icon }: { label: string; value: string | number; tone: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3 ${TONE_CLS[tone] ?? ""}`}>
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider opacity-80">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

/* Legacy "Doctor Booking" tab removed - superseded by New Visit (FrontOfficeVisitsTab).
   Any inbound ?tab=booking links redirect to ?tab=visits via validateSearch above. */




function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] items-center gap-3">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ================= Patient Registration ================= */
function PatientRegistrationTab({ patients: pts, setPatients }: {
  patients: Patient[]; setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
}) {
  const [form, setForm] = useState({ name: "", phone: "", age: "", gender: "M" as "M" | "F", address: "", allergies: "", insurancePlanId: "" });
  const [confirmDup, setConfirmDup] = useState(false);
  const [saving, setSaving] = useState(false);

  const matches = useMemo(
    () => (/^\d{10}$/.test(form.phone) ? pts.filter((p) => p.phone === form.phone) : []),
    [form.phone, pts]
  );

  const doRegister = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const p: Patient = {
        id: `p${Date.now()}`, mrn: nextMrn(), name: form.name.trim(), phone: form.phone,
        age: +form.age || 0, gender: form.gender, address: form.address,
        allergies: form.allergies.split(",").map((s) => s.trim()).filter(Boolean), createdAt: new Date().toISOString(),
        insurancePlanId: form.insurancePlanId || undefined,
      };
      setPatients((xs) => [p, ...xs]);
      patients.unshift(p);
      persistNow();
      audit("front_office", "patient_registered", { entity: "patient", entityId: p.id, meta: { mrn: p.mrn, name: p.name, phone: p.phone, insurancePlanId: p.insurancePlanId } });
      toast.success(`Registered ${p.name} · ${p.mrn}`);
      setForm({ name: "", phone: "", age: "", gender: "M", address: "", allergies: "", insurancePlanId: "" });
      setConfirmDup(false);
    } finally {
      setSaving(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim() || !/^\d{10}$/.test(form.phone)) { toast.error("Name and valid 10-digit phone required"); return; }
    if (matches.length > 0) { setConfirmDup(true); return; }
    doRegister();
  };

  const useExisting = (p: Patient) => {
    setForm({
      name: p.name, phone: p.phone, age: String(p.age),
      gender: p.gender, address: p.address ?? "", allergies: p.allergies.join(", "),
      insurancePlanId: p.insurancePlanId ?? "",
    });
    toast.info(`Loaded ${p.name} · ${p.mrn}`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[24rem_1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4">
        <div className="mb-2 text-sm font-semibold">New Patient</div>
        <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Mobile</Label><Input inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="h-10" /></div>
          <div><Label>Age</Label><Input inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, "") })} className="h-10" /></div>
        </div>

        {matches.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
            <div className="mb-1 font-semibold text-amber-900 dark:text-amber-200">
              {matches.length} patient{matches.length > 1 ? "s" : ""} already registered on this number:
            </div>
            <div className="space-y-1">
              {matches.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded bg-background/60 px-2 py-1">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">{p.mrn}</span>
                    <span className="ml-2 text-muted-foreground">· {p.age}{p.gender}</span>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => useExisting(p)}>Use</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>Gender</Label>
          <div className="mt-1 flex gap-2">
            {(["M","F"] as const).map((g) => (
              <button key={g} type="button" onClick={() => setForm({ ...form, gender: g })} className={`h-10 flex-1 rounded-md border text-sm ${form.gender === g ? "border-primary bg-primary/10 text-primary" : ""}`}>{g === "M" ? "Male" : "Female"}</button>
            ))}
          </div>
        </div>
        <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-10" /></div>
        <div><Label>Clinical Alerts / Allergies (comma separated)</Label><Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Diabetic, Hypertensive, Pregnant" className="h-10" /></div>
        
        <div>
          <Label>Insurance & TPA Plan (Optional)</Label>
          <select
            value={form.insurancePlanId}
            onChange={(e) => setForm({ ...form, insurancePlanId: e.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">No Insurance (Self Pay)</option>
            {insurancePlans.map((ip) => (
              <option key={ip.id} value={ip.id}>
                {ip.providerName} ({ip.policyNumber}) - {ip.coveragePercent}%
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          {saving ? "Registering…" : "Register Patient"}
        </Button>
        <p className="text-[11px] text-muted-foreground">MRN is auto-generated and unique across Front Office, Lab, Pharmacy and Accounts.</p>
      </form>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/40 p-3 text-sm font-semibold">Recent Patients ({pts.length})</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">MRN</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Age/Sex</th><th className="px-3 py-2">Mobile</th><th className="px-3 py-2">Clinical Alerts</th></tr>
          </thead>
          <tbody>
            {pts.slice(0, 20).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{p.mrn}</td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 text-xs">{p.age}{p.gender}</td>
                <td className="px-3 py-2 text-xs">{p.phone}</td>
                <td className="px-3 py-2 text-xs">{p.allergies.join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={confirmDup} onOpenChange={(v) => { if (!v) setConfirmDup(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate mobile number</DialogTitle>
            <DialogDescription>
              {matches.length} patient{matches.length > 1 ? "s are" : " is"} already registered on {form.phone}.
              You can use an existing record or register this person as a new patient (a new MRN will be issued).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 space-y-1 overflow-auto">
            {matches.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{p.name} <span className="ml-1 font-mono text-[10px] text-muted-foreground">{p.mrn}</span></div>
                  <div className="text-xs text-muted-foreground">{p.age}{p.gender} · {p.address || "-"}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => { useExisting(p); setConfirmDup(false); }}>Use this</Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDup(false)}>Cancel</Button>
            <Button onClick={doRegister} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Register anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


/* ================= Appointments (calendar) ================= */
type ApptForm = {
  patientId?: string;
  patientName: string;
  patientPhone: string;
  age: string;
  gender: "M" | "F";
  note: string;
  doctorId: string;
  start: string;
  duration: number;
  status: AppointmentStatus;
};

const EMPTY_FORM: ApptForm = {
  patientName: "", patientPhone: "", age: "", gender: "M", note: "",
  doctorId: "", start: "09:00", duration: 15, status: "scheduled",
};

function AppointmentsTab({ doctors, appts, setAppts }: {
  doctors: Doctor[]; appts: Appointment[]; setAppts: React.Dispatch<React.SetStateAction<Appointment[]>>;
}) {
  const [pickDate, setPickDate] = useState<Date>(() => new Date());
  const dayIdx = (pickDate.getDay() + 6) % 7;
  const day = DAYS[dayIdx];
  const isToday = new Date().toDateString() === pickDate.toDateString();
  const [datePopOpen, setDatePopOpen] = useState(false);
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: string; form: ApptForm } | null>(null);
  const [lookup, setLookup] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "list" : "grid",
  );
  const visible = doctors.filter((d) => d.days.includes(day));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const shiftDate = (delta: number) => {
    const d = new Date(pickDate);
    d.setDate(d.getDate() + delta);
    setPickDate(d);
  };
  const dateLabel = pickDate.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });

  const filtered = search.trim()
    ? appts.filter((a) => {
        const s = search.toLowerCase();
        return a.patientName.toLowerCase().includes(s) || (a.patientPhone ?? "").includes(s);
      })
    : appts;

  const slotOccupied = (doctorId: string, start: string, ignoreId?: string) =>
    appts.some((a) => a.id !== ignoreId && a.doctorId === doctorId && a.start === start && a.status !== "cancelled");

  const onEnd = (e: DragEndEvent) => {
    const id = String(e.active.id); const over = e.over?.id ? String(e.over.id) : null;
    if (!over) return;
    const [doctorId, start] = over.split("|");
    if (slotOccupied(doctorId, start, id)) { toast.error("Slot already booked"); return; }
    setAppts((xs) => xs.map((a) => a.id === id ? { ...a, doctorId, start } : a));
    toast.success("Appointment moved");
  };

  const openCreate = (doctorId: string, start: string) => {
    setDialog({ mode: "create", form: { ...EMPTY_FORM, doctorId, start } });
  };
  const openEdit = (a: Appointment) => {
    setDialog({
      mode: "edit", id: a.id,
      form: {
        patientId: a.patientId,
        patientName: a.patientName,
        patientPhone: a.patientPhone ?? "",
        age: a.age ? String(a.age) : "",
        gender: a.gender ?? "M",
        note: a.note ?? "",
        doctorId: a.doctorId, start: a.start,
        duration: a.duration ?? 15, status: a.status,
      },
    });
  };

  const save = () => {
    if (!dialog) return;
    const f = dialog.form;
    if (!f.patientName.trim()) { toast.error("Patient name required"); return; }
    if (!f.doctorId) { toast.error("Pick doctor"); return; }
    if (slotOccupied(f.doctorId, f.start, dialog.id)) { toast.error("Slot conflict - pick another time"); return; }
    const base: Omit<Appointment, "id"> = {
      patientId: f.patientId,
      patientName: f.patientName.trim(),
      patientPhone: f.patientPhone.trim() || undefined,
      age: f.age ? +f.age : undefined,
      gender: f.gender,
      note: f.note.trim() || undefined,
      doctorId: f.doctorId, start: f.start, duration: f.duration, status: f.status,
    };
    if (dialog.mode === "create") {
      const na: Appointment = { id: `a${Date.now()}`, ...base };
      setAppts((xs) => [...xs, na]); appointmentsMutate(na, "add");
      toast.success(`Booked ${na.patientName}`);
    } else if (dialog.id) {
      const id = dialog.id;
      setAppts((xs) => xs.map((a) => a.id === id ? { ...a, ...base } : a));
      appointmentsMutate({ id, ...base } as Appointment, "update");
      toast.success("Appointment updated");
    }
    setDialog(null);
  };

  const remove = () => {
    if (!dialog?.id) return;
    const id = dialog.id;
    setAppts((xs) => xs.filter((a) => a.id !== id));
    appointmentsMutate({ id } as Appointment, "remove");
    toast.success("Appointment deleted");
    setDialog(null);
  };

  const setStatus = (id: string, status: AppointmentStatus) =>
    setAppts((xs) => xs.map((a) => a.id === id ? { ...a, status } : a));

  const pickPatient = (p: Patient) => {
    setDialog((d) => d ? {
      ...d,
      form: {
        ...d.form,
        patientId: p.id, patientName: p.name, patientPhone: p.phone || "",
        age: String(p.age), gender: (p.gender as "M" | "F") ?? "M",
      },
    } : d);
    setLookup(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Date</div>
          <div className="flex items-center overflow-hidden rounded-md border">
            <button onClick={() => shiftDate(-1)} className="px-2 py-1 hover:bg-accent" aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <Popover open={datePopOpen} onOpenChange={setDatePopOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 border-x px-2.5 py-1 text-xs font-semibold hover:bg-accent">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {dateLabel}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={pickDate}
                  onSelect={(d) => { if (d) { setPickDate(d); setDatePopOpen(false); } }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <button onClick={() => shiftDate(1)} className="px-2 py-1 hover:bg-accent" aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {!isToday && (
            <button onClick={() => setPickDate(new Date())} className="rounded-md border px-2 py-1 text-[11px] font-semibold hover:bg-accent">Today</button>
          )}
          <div className="hidden text-xs text-muted-foreground sm:block">Drag to reschedule · click empty slot to book</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient…" className="h-8 w-40 pl-7 text-xs" />
          </div>
          <div className="flex overflow-hidden rounded-md border md:hidden">
            <button onClick={() => setViewMode("list")} className={`px-2 py-1 text-xs ${viewMode === "list" ? "bg-primary text-primary-foreground" : ""}`}>List</button>
            <button onClick={() => setViewMode("grid")} className={`px-2 py-1 text-xs ${viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}`}>Grid</button>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {(Object.keys(apptMeta) as AppointmentStatus[]).map((s) => (
              <span key={s} className={`rounded-full border px-2 py-0.5 ${apptMeta[s].cls}`}>{apptMeta[s].label}</span>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No doctors available on {day}.</div>
      ) : viewMode === "list" ? (
        <ApptListView doctors={visible} appts={filtered.filter((a) => visible.some((d) => d.id === a.doctorId))}
          onEdit={openEdit} onStatus={setStatus} onNew={(dId) => openCreate(dId, "09:00")} />
      ) : (
        <DndContext sensors={sensors} onDragEnd={onEnd}>
          <div className="overflow-auto rounded-xl border bg-card">
            <div className="grid" style={{ gridTemplateColumns: `72px repeat(${visible.length}, minmax(180px, 1fr))` }}>
              <div className="sticky left-0 z-10 border-b border-r bg-muted/60 px-2 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Time</div>
              {visible.map((d) => (
                <div key={d.id} className="border-b border-r bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Stethoscope className="h-3.5 w-3.5 text-primary" />{d.name}
                    {d.type === "visiting" && <Badge variant="outline" className="ml-1 text-[9px]">Visiting</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{d.specialty} · ₹{d.fee}</div>
                </div>
              ))}
              {SLOTS.map((t) => (
                <Fragment key={`r-${t}`}>
                  <div className="sticky left-0 z-10 border-b border-r bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground">{to12h(t)}</div>
                  {visible.map((d) => {
                    const cellId = `${d.id}|${t}`;
                    const a = filtered.find((x) => x.doctorId === d.id && x.start === t);
                    return (
                      <SlotCell key={cellId} id={cellId} onEmptyClick={() => openCreate(d.id, t)}>
                        {a && <ApptCard appt={a} onStatus={(s) => setStatus(a.id, s)} onEdit={() => openEdit(a)} />}
                      </SlotCell>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </DndContext>
      )}

      <Dialog open={!!dialog} onOpenChange={(v) => { if (!v) setDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Edit appointment" : "New appointment"} · {dialog ? to12h(dialog.form.start) : ""}</DialogTitle>
            <DialogDescription>{doctors.find((d) => d.id === dialog?.form.doctorId)?.name}</DialogDescription>
          </DialogHeader>
          {dialog && (
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1"><Label>Patient name *</Label>
                  <Input autoFocus value={dialog.form.patientName}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, patientName: e.target.value } })}
                    className="mt-1 h-10" />
                </div>
                <Button variant="outline" size="sm" onClick={() => setLookup(true)}>Find existing</Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Phone</Label><Input value={dialog.form.patientPhone} inputMode="numeric"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, patientPhone: e.target.value.replace(/\D/g, "") } })} className="mt-1 h-10" /></div>
                <div><Label>Age</Label><Input value={dialog.form.age} inputMode="numeric"
                  onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, age: e.target.value.replace(/\D/g, "") } })} className="mt-1 h-10" /></div>
                <div><Label>Gender</Label>
                  <div className="mt-1 flex h-10 overflow-hidden rounded-md border">
                    {(["M","F"] as const).map((g) => (
                      <button key={g} onClick={() => setDialog({ ...dialog, form: { ...dialog.form, gender: g } })}
                        className={`flex-1 text-sm font-semibold ${dialog.form.gender === g ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{g}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Doctor</Label>
                  <select value={dialog.form.doctorId}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, doctorId: e.target.value } })}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div><Label>Time</Label>
                  <select value={dialog.form.start}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, start: e.target.value } })}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm font-mono">
                    {SLOTS.map((t) => <option key={t} value={t}>{to12h(t)}</option>)}
                  </select>
                </div>
                <div><Label>Duration</Label>
                  <select value={dialog.form.duration}
                    onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, duration: +e.target.value } })}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                    {[10,15,20,30,45,60].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Reason / note</Label>
                <Input value={dialog.form.note} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, note: e.target.value } })} className="mt-1 h-10" />
              </div>
              {dialog.mode === "edit" && (
                <div><Label>Status</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(Object.keys(apptMeta) as AppointmentStatus[]).map((s) => (
                      <button key={s} onClick={() => setDialog({ ...dialog, form: { ...dialog.form, status: s } })}
                        className={`rounded-md border px-2 py-1 text-xs ${dialog.form.status === s ? apptMeta[s].cls + " ring-2 ring-primary/40" : "bg-background hover:bg-accent"}`}>
                        {apptMeta[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {dialog?.mode === "edit" && (
              <Button variant="destructive" size="sm" onClick={remove} className="mr-auto"><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
            )}
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={save}><Save className="mr-2 h-4 w-4" />{dialog?.mode === "edit" ? "Save changes" : "Book"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PatientLookup open={lookup} onClose={() => setLookup(false)} onPick={pickPatient} />
    </div>
  );
}

// Keep the shared seed array in sync so other tabs (Reports) see edits.
function appointmentsMutate(a: Appointment, op: "add" | "update" | "remove") {
  if (op === "add") seedAppts.push(a);
  else if (op === "update") {
    const i = seedAppts.findIndex((x) => x.id === a.id);
    if (i >= 0) seedAppts[i] = a;
  } else {
    const i = seedAppts.findIndex((x) => x.id === a.id);
    if (i >= 0) seedAppts.splice(i, 1);
  }
  persistNow();
}

function ApptListView({ doctors, appts, onEdit, onStatus, onNew }: {
  doctors: Doctor[]; appts: Appointment[];
  onEdit: (a: Appointment) => void;
  onStatus: (id: string, s: AppointmentStatus) => void;
  onNew: (doctorId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {doctors.map((d) => {
        const list = appts.filter((a) => a.doctorId === d.id).sort((a, b) => a.start.localeCompare(b.start));
        return (
          <div key={d.id} className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Stethoscope className="h-4 w-4 text-primary" />{d.name}
                <span className="text-xs text-muted-foreground">· {d.specialty}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => onNew(d.id)}><Plus className="mr-1 h-3.5 w-3.5" />Book</Button>
            </div>
            {list.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No appointments</div>
            ) : (
              <ul className="divide-y">
                {list.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="w-16 font-mono text-xs text-muted-foreground">{to12h(a.start)}</div>
                    <button onClick={() => onEdit(a)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-medium">{a.patientName}
                        {a.age ? <span className="ml-1 text-xs text-muted-foreground">· {a.age}{a.gender ?? ""}</span> : null}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{a.patientPhone || "-"} · {a.duration}m {a.note ? `· ${a.note}` : ""}</div>
                    </button>
                    <Badge className={`shrink-0 text-[10px] ${apptMeta[a.status].cls}`}>{apptMeta[a.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SlotCell({ id, onEmptyClick, children }: { id: string; onEmptyClick: () => void; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} onClick={() => !children && onEmptyClick()} className={`min-h-[44px] border-b border-r p-1 transition ${isOver ? "bg-primary/10" : ""} ${!children ? "cursor-pointer hover:bg-accent/30" : ""}`}>
      {children}
    </div>
  );
}
function ApptCard({ appt, onStatus, onEdit }: { appt: Appointment; onStatus: (s: AppointmentStatus) => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: appt.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} className={`select-none rounded-md border px-2 py-1 text-xs shadow-sm ${apptMeta[appt.status].cls} ${isDragging ? "opacity-70" : ""}`}>
      <div {...listeners} {...attributes} onClick={(e) => { e.stopPropagation(); onEdit(); }} className="cursor-grab active:cursor-grabbing">
        <div className="truncate font-semibold">{appt.patientName}</div>
        <div className="truncate text-[10px] opacity-80">
          {appt.age ? `${appt.age}${appt.gender ?? ""} · ` : ""}{appt.duration}m{appt.patientPhone ? ` · ${appt.patientPhone}` : ""}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[9px]">
        {(["checkedin","waiting","cancelled","noshow"] as AppointmentStatus[]).map((s) => (
          <button key={s} onClick={(e) => { e.stopPropagation(); onStatus(s); }}
            title={apptMeta[s].label}
            className={`rounded border bg-background/70 px-1 py-0.5 hover:bg-background ${appt.status === s ? "ring-1 ring-primary" : ""}`}>
            {apptMeta[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================= Cross Consultation ================= */
function CrossConsultTab({ doctors, invoices: invs, setInvoices }: {
  doctors: Doctor[]; invoices: Invoice[]; setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
}) {
  const [lookup, setLookup] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [fee, setFee] = useState(200);
  const [saving, setSaving] = useState(false);
  const parent = invs.find((i) => i.patientId === patient?.id && i.department === "front_office" && !i.crossConsult);

  const save = async () => {
    if (saving) return;
    if (!patient) { toast.error("Pick patient"); return; }
    const doc = doctors.find((d) => d.id === doctorId);
    if (!doc) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const inv: Invoice = {
        id: `CC-${1000 + crossConsults.length + 1}`, patientId: patient.id, date: now, department: "front_office", billingAccount: "op",
        crossConsult: true, parentInvoiceId: parent?.id,
        lines: [{ desc: `Cross-consultation · ${doc.name}`, qty: 1, rate: fee }],
        discount: 0, paid: true,
        audit: [{ at: now, by: "reception", note: "Cross-consultation" }],
      };
      setInvoices((xs) => [inv, ...xs]); invoices.unshift(inv);
      audit("front_office", "cross_consult", { entity: "invoice", entityId: inv.id, meta: { mrn: patient.mrn, doctor: doc.name, fee } });
      crossConsults.push({ id: `xc${Date.now()}`, patientId: patient.id, parentInvoiceId: parent?.id ?? "", doctorId, fee, date: now });
      persistNow();
      toast.success(`Cross-consult saved · ${inv.id}`);
      setPatient(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold">Add Cross Consultation</div>
        <Row label="Patient *">
          <div className="flex gap-2">
            <Input readOnly value={patient ? `${patient.name} · ${patient.mrn}` : ""} className="h-9" />
            <Button size="sm" variant="outline" onClick={() => setLookup(true)}>Find</Button>
          </div>
        </Row>
        <Row label="Parent OP">
          <Input readOnly value={parent?.id ?? "- no active OP -"} className="h-9 font-mono" />
        </Row>
        <Row label="Second Doctor">
          <select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); const d = doctors.find((x) => x.id === e.target.value); if (d) setFee(Math.round(d.fee / 2)); }} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.type === "visiting" ? " (Visiting)" : ""}</option>)}

          </select>
        </Row>
        <Row label="Fee"><Input inputMode="numeric" value={fee} onChange={(e) => setFee(+e.target.value || 0)} className="h-9 font-mono" /></Row>
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Saving…" : "Save Cross Consultation"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/40 p-3 text-sm font-semibold">Cross Consults Today</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Patient</th><th className="px-3 py-2">Doctor</th><th className="px-3 py-2 text-right">Fee</th></tr>
          </thead>
          <tbody>
            {invs.filter((i) => i.crossConsult).map((i) => {
              const p = findPatient(i.patientId);
              return (
                <tr key={i.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{i.id}</td>
                  <td className="px-3 py-2">{p?.name}</td>
                  <td className="px-3 py-2 text-xs">{i.lines[0]?.desc.replace(/^.*-\s*/, "")}</td>
                  <td className="px-3 py-2 text-right font-mono">₹{invoiceTotal(i).total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PatientLookup open={lookup} onClose={() => setLookup(false)} onPick={(p) => { setPatient(p); setLookup(false); }} />
    </div>
  );
}

/* ================= Procedure Bill Entry ================= */
function ProcedureBillTab({ invoices: invs, setInvoices }: {
  invoices: Invoice[]; setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
}) {
  const [lookup, setLookup] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [ba, setBa] = useState<BillingAccount>("op");
  const [discount, setDiscount] = useState(0);
  const [procs, setProcs] = useState<Procedure[]>(seedProcedures);
  const [addOpen, setAddOpen] = useState(false);
  const [newProc, setNewProc] = useState<{ code: string; name: string; rate: string }>({ code: "", name: "", rate: "" });
  const [printInvId, setPrintInvId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const total = lines.reduce((s, l) => s + l.qty * l.rate, 0) - discount;

  const add = (id: string) => {
    const p = procs.find((x) => x.id === id); if (!p) return;
    setLines((xs) => [...xs, { desc: `${p.name} (${p.code})`, qty: 1, rate: p.rate }]);
  };

  const addProc = () => {
    if (!newProc.code.trim() || !newProc.name.trim()) { toast.error("Code and Name required"); return; }
    const proposal = { code: newProc.code.trim().toUpperCase(), name: newProc.name.trim(), rate: +newProc.rate || 0 };
    notify("procedure_proposal", `Front Office proposed procedure "${proposal.name}" at ₹${proposal.rate}`, proposal);
    audit("front_office", "procedure_proposal", { entity: "procedure", meta: proposal });
    setNewProc({ code: "", name: "", rate: "" });
    setAddOpen(false);
    toast.success("Proposal sent to Administrator for approval");
  };
  // Removals also require admin approval; kept for reference but not surfaced in UI.
  const _delProc = (id: string) => {
    setProcs((xs) => { const next = xs.filter((p) => p.id !== id); seedProcedures.length = 0; next.forEach((x) => seedProcedures.push(x)); return next; });
  };
  void _delProc;

  const persist = (): Invoice | null => {
    if (!patient || lines.length === 0) { toast.error("Patient and at least one procedure required"); return null; }
    const now = new Date().toISOString();
    const seq = invs.filter((i) => i.department === "front_office").length + 1;
    const inv: Invoice = {
      id: `PRC-${5000 + seq}`, patientId: patient.id, date: now, department: "front_office", billingAccount: ba,
      lines, discount, paid: true,
      audit: [{ at: now, by: "reception", note: "Procedure bill" }],
    };
    setInvoices((xs) => [inv, ...xs]); invoices.unshift(inv);
    audit("front_office", "procedure_bill", { entity: "invoice", entityId: inv.id, meta: { mrn: patient.mrn, total, account: ba } });
    persistNow();
    return inv;
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const inv = persist();
      if (!inv) return;
      toast.success(`Saved ${inv.id} · ₹${total}`);
      setPatient(null); setLines([]); setDiscount(0);
    } finally { setSaving(false); }
  };
  const printNow = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const inv = persist();
      if (!inv) return;
      setPrintInvId(inv.id);
    } finally { setSaving(false); }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[24rem_1fr]">
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Procedure Master</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Prices set by Administrator</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" />Propose</Button>
        </div>
        <div className="max-h-96 space-y-1 overflow-auto">
          {procs.map((p) => (
            <div key={p.id} className="group flex items-center gap-1 rounded-md border px-2 py-1.5 hover:border-primary">
              <button onClick={() => add(p.id)} className="flex flex-1 items-center justify-between text-left text-sm">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.code}</div>
                </div>
                <div className="font-mono text-sm">₹{p.rate}</div>
              </button>
            </div>
          ))}
          {procs.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">No procedures yet.</div>}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Procedure Bill</div>
          <Button size="sm" variant="outline" onClick={() => setLookup(true)}><Search className="mr-1 h-4 w-4" />Find Patient</Button>
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          {patient ? <><b>{patient.name}</b> · {patient.mrn} · {patient.age}{patient.gender} · {patient.phone}</> : <span className="text-muted-foreground">No patient selected</span>}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-2 py-1">Description</th><th className="px-2 py-1 text-right">Qty</th><th className="px-2 py-1 text-right">Rate</th><th className="px-2 py-1 text-right">Amount</th><th></th></tr>
          </thead>
          <tbody>
            {lines.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">Click a procedure on the left to add it</td></tr>}
            {lines.map((l, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1">{l.desc}</td>
                <td className="px-2 py-1 text-right"><Input value={l.qty} onChange={(e) => setLines((xs) => xs.map((x, j) => j === i ? { ...x, qty: +e.target.value || 1 } : x))} className="h-8 w-16 text-right font-mono" /></td>
                <td className="px-2 py-1 text-right font-mono">₹{l.rate}</td>
                <td className="px-2 py-1 text-right font-mono">₹{l.qty * l.rate}</td>
                <td className="px-2 py-1"><Button size="sm" variant="ghost" onClick={() => setLines((xs) => xs.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Billing A/c</Label>
            <select value={ba} onChange={(e) => setBa(e.target.value as BillingAccount)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="op">OP Billing</option><option value="general">General Billing</option>
            </select>
          </div>
          <div><Label>Discount</Label><Input inputMode="numeric" value={discount} onChange={(e) => setDiscount(+e.target.value || 0)} className="h-9 font-mono" /></div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Net Amount</div>
            <div className="font-mono text-2xl font-bold text-primary">₹ {total.toLocaleString("en-IN")}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={printNow} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Printer className="mr-1 h-4 w-4" />}
              Save &amp; Print
            </Button>
          </div>
        </div>
      </div>

      <PatientLookup open={lookup} onClose={() => setLookup(false)} onPick={(p) => { setPatient(p); setLookup(false); }} />
      <BillPrintPreview invoiceId={printInvId} open={!!printInvId} onClose={() => { setPrintInvId(null); setPatient(null); setLines([]); setDiscount(0); }} />

      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) setAddOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose Procedure</DialogTitle>
            <DialogDescription>Front Office cannot set prices directly. Your proposal is sent to the Administrator for approval; you will see a notification once approved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[8rem_1fr] items-center gap-3">
              <Label>Code</Label>
              <Input autoFocus value={newProc.code} onChange={(e) => setNewProc({ ...newProc, code: e.target.value })} placeholder="e.g. DRESS" className="h-10 uppercase" />
            </div>
            <div className="grid grid-cols-[8rem_1fr] items-center gap-3">
              <Label>Name</Label>
              <Input value={newProc.name} onChange={(e) => setNewProc({ ...newProc, name: e.target.value })} placeholder="Procedure name" className="h-10" />
            </div>
            <div className="grid grid-cols-[8rem_1fr] items-center gap-3">
              <Label>Suggested Charge (₹)</Label>
              <Input inputMode="numeric" value={newProc.rate} onChange={(e) => setNewProc({ ...newProc, rate: e.target.value.replace(/\D/g, "") })} className="h-10 font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addProc}><ShieldCheck className="mr-2 h-4 w-4" />Send for Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= Doctors master ================= */
function DoctorsTab({ doctors, setDoctors }: {
  doctors: Doctor[]; setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
}) {
  const [open, setOpen] = useState<Doctor | "new" | null>(null);
  const empty: Doctor = { id: `doc${Date.now()}`, name: "", specialty: "", type: "permanent", fee: 0, days: [...DAYS], active: true };
  const [form, setForm] = useState<Doctor>(empty);

  const save = () => {
    if (!form.name.trim() || !form.specialty.trim()) { toast.error("Name & specialty required"); return; }
    setDoctors((xs) => {
      const existing = xs.find((d) => d.id === form.id);
      const next = existing ? xs.map((d) => d.id === form.id ? form : d) : [form, ...xs];
      // sync mock arrays
      seedDoctors.length = 0; next.forEach((d) => seedDoctors.push(d));
      return next;
    });
    toast.success(open === "new" ? "Doctor added" : "Doctor updated");
    setOpen(null);
  };
  const del = (id: string) => {
    setDoctors((xs) => xs.filter((d) => d.id !== id));
    toast.success("Doctor removed");
  };
  const toggle = (id: string) => setDoctors((xs) => xs.map((d) => d.id === id ? { ...d, active: !d.active } : d));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ ...empty, id: `doc${Date.now()}` }); setOpen("new"); }}><Plus className="mr-2 h-4 w-4" />Add Doctor</Button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Specialty</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Fee</th><th className="px-3 py-2">Days</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2 font-medium">{d.name}</td>
                <td className="px-3 py-2 text-xs">{d.specialty}</td>
                <td className="px-3 py-2 text-xs">{d.type === "visiting" ? <Badge variant="outline" className="text-amber-700">Visiting</Badge> : <Badge variant="outline">Permanent</Badge>}</td>
                <td className="px-3 py-2 text-right font-mono">₹{d.fee}</td>
                <td className="px-3 py-2 text-xs">{d.days.join(", ")}</td>
                <td className="px-3 py-2"><Badge variant={d.active ? "default" : "outline"}>{d.active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setForm(d); setOpen(d); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle(d.id)}>{d.active ? "Deactivate" : "Activate"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open === "new" ? "Add Doctor" : "Edit Doctor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Specialty</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="h-10" /></div>
              <div><Label>Fee</Label><Input inputMode="numeric" value={form.fee} onChange={(e) => setForm({ ...form, fee: +e.target.value || 0 })} className="h-10 font-mono" /></div>
            </div>
            <div>
              <Label>Type</Label>
              <div className="mt-1 flex gap-2">
                {(["permanent","visiting"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} className={`h-10 flex-1 rounded-md border text-sm capitalize ${form.type === t ? "border-primary bg-primary/10 text-primary" : ""}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Available Days</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {DAYS.map((d) => {
                  const on = form.days.includes(d);
                  return <button key={d} type="button" onClick={() => setForm({ ...form, days: on ? form.days.filter((x) => x !== d) : [...form.days, d] })} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : ""}`}>{d}</button>;
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={save}><Save className="mr-2 h-4 w-4" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= Reports ================= */
type DateRange = "today" | "7d" | "month" | "all" | "custom";
const RANGE_LABEL: Record<DateRange, string> = { today: "Today", "7d": "Last 7 days", month: "This month", all: "All time", custom: "Custom range" };

function ReportsTab({ invoices: invs, appts, doctors }: { invoices: Invoice[]; appts: Appointment[]; doctors: Doctor[] }) {
  const [kind, setKind] = useState<"booking" | "sales" | "doctor" | "cross" | "procedure">("sales");
  const [deptSel, setDeptSel] = useState<"all" | BillingAccount>("all");
  const [range, setRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  const salesCols: ReportColumn<Invoice>[] = [
    { key: "id", header: "Invoice" },
    { key: "date", header: "Date", accessor: (i) => new Date(i.date).toLocaleDateString() },
    { key: "patient", header: "Patient", accessor: (i) => findPatient(i.patientId)?.name ?? "" },
    { key: "dept", header: "Department", accessor: (i) => i.department },
    { key: "ba", header: "Billing A/c", accessor: (i) => BILLING_ACCOUNT_LABEL[i.billingAccount] },
    { key: "total", header: "Total", align: "right", accessor: (i) => invoiceTotal(i).total },
    { key: "paid", header: "Paid", accessor: (i) => i.paid ? "Yes" : "No" },
  ];

  if (kind === "sales") {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const start7 = startOfToday - 6 * 24 * 3600 * 1000;
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const customFromTs = customFrom ? new Date(customFrom + "T00:00:00").getTime() : null;
    const customToTs = customTo ? new Date(customTo + "T23:59:59").getTime() : null;
    const inRange = (iso: string) => {
      if (range === "all") return true;
      const t = new Date(iso).getTime();
      if (range === "today") return t >= startOfToday;
      if (range === "7d") return t >= start7;
      if (range === "month") return t >= startMonth;
      // custom
      if (customFromTs !== null && t < customFromTs) return false;
      if (customToTs !== null && t > customToTs) return false;
      return true;
    };
    const filtered = invs.filter((i) => {
      if (!inRange(i.date)) return false;
      if (deptSel !== "all" && i.billingAccount !== deptSel) return false;
      return true;
    });
    const totals = filtered.reduce((acc, i) => {
      const t = invoiceTotal(i).total;
      acc[i.billingAccount] = (acc[i.billingAccount] || 0) + t;
      return acc;
    }, {} as Record<string, number>);
    const allDepts = Object.keys(BILLING_ACCOUNT_LABEL) as BillingAccount[];
    const isAll = deptSel === "all";
    const rangeSuffix =
      range === "custom"
        ? `custom-${customFrom || "any"}_${customTo || "any"}`
        : range;
    const filename = `fo-sales-${isAll ? "all" : deptSel}-${rangeSuffix}`;
    const rangeLabel =
      range === "custom"
        ? `${customFrom || "…"} → ${customTo || "…"}`
        : RANGE_LABEL[range];
    const subtitle = `${isAll ? "All departments" : BILLING_ACCOUNT_LABEL[deptSel]} · ${rangeLabel}`;

    return (
      <div className="space-y-3">
        <KindPicker kind={kind} onChange={setKind} />

        {/* Toolbar: compact filter dropdowns */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card px-3 py-2">
          <div className="min-w-[10rem]">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Department</div>
            <Select value={deptSel} onValueChange={(v) => setDeptSel(v as "all" | BillingAccount)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {allDepts.map((d) => (
                  <SelectItem key={d} value={d}>{BILLING_ACCOUNT_LABEL[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[10rem]">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Period</div>
            <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RANGE_LABEL) as DateRange[]).map((r) => (
                  <SelectItem key={r} value={r}>{RANGE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {range === "custom" && (
            <>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</div>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9" />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">To</div>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9" />
              </div>
            </>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} record{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {allDepts.map((k) => {
            const active = isAll || deptSel === k;
            return (
              <div key={k} className={`rounded-xl border bg-card p-3 ${active ? "" : "opacity-40"}`}>
                <div className="text-[11px] uppercase text-muted-foreground">{BILLING_ACCOUNT_LABEL[k]}</div>
                <div className="font-mono text-xl font-bold">₹{(totals[k] || 0).toLocaleString("en-IN")}</div>
              </div>
            );
          })}
        </div>
        <ReportView title="Sales Report · Department Wise" subtitle={subtitle} filename={filename} columns={salesCols} rows={filtered} />
      </div>
    );
  }
  if (kind === "booking") {
    const cols: ReportColumn<Appointment>[] = [
      { key: "id", header: "ID" }, { key: "patient", header: "Patient", accessor: (a) => a.patientName },
      { key: "doctor", header: "Doctor", accessor: (a) => doctors.find((d) => d.id === a.doctorId)?.name ?? "" },
      { key: "start", header: "Time", accessor: (a) => to12h(a.start) }, { key: "status", header: "Status" },
    ];
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Booking List" subtitle="Today's appointments" filename="fo-bookings" columns={cols} rows={appts} /></div>;
  }
  if (kind === "doctor") {
    const rows = doctors.map((d) => {
      const dInvs = invs.filter((i) => i.lines.some((l) => l.desc.includes(d.name)));
      const total = dInvs.reduce((s, i) => s + invoiceTotal(i).total, 0);
      return { name: d.name, specialty: d.specialty, count: dInvs.length, total };
    });
    const cols: ReportColumn<typeof rows[number]>[] = [
      { key: "name", header: "Doctor" }, { key: "specialty", header: "Specialty" },
      { key: "count", header: "Consults", align: "right" }, { key: "total", header: "Collection ₹", align: "right" },
    ];
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Doctor-wise Collection" subtitle="Consultation revenue" filename="fo-doctorwise" columns={cols} rows={rows} /></div>;
  }
  if (kind === "cross") {
    const rows = invs.filter((i) => i.crossConsult);
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Cross Consultation Log" filename="fo-cross" columns={salesCols} rows={rows} /></div>;
  }
  const rows = invs.filter((i) => i.id.startsWith("PRC-"));
  return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Procedure Sales" filename="fo-procedure" columns={salesCols} rows={rows} /></div>;
}

function KindPicker<T extends string>({ kind, onChange }: { kind: T; onChange: (k: T) => void }) {
  const opts: { k: string; label: string }[] = [
    { k: "sales", label: "Sales (dept wise)" }, { k: "booking", label: "Booking List" },
    { k: "doctor", label: "Doctor Collection" }, { k: "cross", label: "Cross Consult" }, { k: "procedure", label: "Procedure Sales" },
  ];
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-2">
      {opts.map((o) => (
        <button key={o.k} onClick={() => onChange(o.k as T)} className={`rounded-md px-3 py-1.5 text-sm ${kind === o.k ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{o.label}</button>
      ))}
    </div>
  );
}
