import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Ticket, Printer, User, Stethoscope, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PatientLookup } from "@/components/patient-lookup";
import {
  doctors, departments, visits, patientSummary, createVisit, getDoctorAvailability, doctorDepartmentId,
  audit, findPatient, findInsurancePlan,
  type Patient, type Doctor, type VisitType, type Visit,
} from "@/lib/mock/data";

const VISIT_TYPES: { value: VisitType; label: string; hint: string }[] = [
  { value: "new", label: "New Patient", hint: "First-ever visit" },
  { value: "returning", label: "Returning", hint: "Has past visits" },
  { value: "review", label: "Review", hint: "Follow-up review" },
  { value: "emergency", label: "Emergency", hint: "Urgent walk-in" },
];

export function FrontOfficeVisitsTab() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [lookup, setLookup] = useState(false);
  const [deptId, setDeptId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [visitType, setVisitType] = useState<VisitType>("new");
  const [fee, setFee] = useState<number>(0);
  const [feePaid, setFeePaid] = useState<boolean>(true);
  const [preAuthRef, setPreAuthRef] = useState<string>("");
  const [useInsurance, setUseInsurance] = useState<boolean>(true);
  const [lastVisit, setLastVisit] = useState<Visit | null>(null);
  const [tick, setTick] = useState(0);

  const activeDepts = useMemo(() => departments.filter((d) => d.active), []);
  const availableDoctors = useMemo(() => {
    const list = doctors.filter((d) => d.active);
    if (!deptId) return list;
    return list.filter((d) => doctorDepartmentId(d) === deptId);
  }, [deptId]);

  const patientVisitCount = patient ? visits.filter((v) => v.patientId === patient.id).length : 0;
  const inferredType: VisitType = patientVisitCount === 0 ? "new" : "returning";

  const onPickPatient = (p: Patient) => {
    setPatient(p);
    setLookup(false);
    setVisitType(patientVisitCount === 0 ? "new" : "returning");
    if (!fee && doctorId) setFee(doctors.find((d) => d.id === doctorId)?.fee ?? 0);
  };

  const onPickDoctor = (id: string) => {
    setDoctorId(id);
    const doc = doctors.find((d) => d.id === id);
    if (doc) {
      setFee(doc.fee);
      if (!deptId) setDeptId(doctorDepartmentId(doc));
    }
  };

  const canRegister = !!patient && !!deptId && !!doctorId && fee >= 0;

  const submit = () => {
    if (!canRegister || !patient) return;
    const doc = doctors.find((d) => d.id === doctorId)!;
    if (getDoctorAvailability(doc.id) !== "present") {
      toast.error(`${doc.name} is marked ${getDoctorAvailability(doc.id)} today`);
      return;
    }
    const insPlan = patient.insurancePlanId ? findInsurancePlan(patient.insurancePlanId) : null;
    const { visit } = createVisit({
      patientId: patient.id,
      departmentId: deptId,
      doctorId,
      visitType: inferredType === "new" ? "new" : visitType,
      fee,
      feePaid: insPlan && useInsurance ? undefined : feePaid, // Don't mark as basic feePaid if it's insurance claim (it calculates custom paid statuses)
      insuranceClaim: insPlan && useInsurance ? {
        planId: insPlan.id,
        preAuthRef: preAuthRef.trim() || undefined,
      } : undefined,
    });
    setLastVisit(visit);
    setTick((n) => n + 1);
    toast.success(`Visit ${visit.id} · Token ${visit.token}`);
    audit("front_office", "visit_registered", { entity: "visit", entityId: visit.id, insurance: !!(insPlan && useInsurance) });
    // Reset fee/dept but keep patient for quick same-patient rebooking (rare)
    setDoctorId("");
    setDeptId("");
    setFee(0);
    setPreAuthRef("");
  };

  const printSlip = (visitId: string, kind: "op-slip" | "token") => {
    window.open(`/print/${kind}/${visitId}`, "_blank");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {/* Step 1: Patient */}
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-indigo-500/15 text-indigo-700"><User className="h-4 w-4" /></div>
            <h3 className="text-sm font-semibold">1 · Patient</h3>
            {patient && <Badge variant="outline" className="ml-auto">{patientVisitCount === 0 ? "New" : `${patientVisitCount} past visit(s)`}</Badge>}
          </div>
          {!patient ? (
            <Button onClick={() => setLookup(true)} className="w-full h-11"><Search className="mr-2 h-4 w-4" />Search patient (or register new)</Button>
          ) : (
            <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">{patient.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{patient.name} <Badge variant="outline" className="ml-1 font-mono text-[10px]">{patient.mrn}</Badge></div>
                <div className="truncate text-xs text-muted-foreground">{patient.age}{patient.gender} · 📱 {patient.phone}{patient.address ? ` · ${patient.address}` : ""}</div>
                {patient.allergies.length > 0 && <div className="mt-0.5 text-[11px] font-semibold text-destructive">⚠ Allergies: {patient.allergies.join(", ")}</div>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setPatient(null); setLastVisit(null); }}>Change</Button>
            </div>
          )}
        </section>

        {/* Step 2: Department & Doctor */}
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500/15 text-emerald-700"><Building2 className="h-4 w-4" /></div>
            <h3 className="text-sm font-semibold">2 · Department & Doctor</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Department</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {activeDepts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setDeptId(d.id); setDoctorId(""); }}
                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${deptId === d.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
                  >
                    <span className="mr-1 font-mono">{d.code}</span>{d.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Doctor</Label>
              <div className="mt-1 grid gap-1.5">
                {availableDoctors.length === 0 && <div className="text-xs text-muted-foreground">No doctors in this department.</div>}
                {availableDoctors.map((doc) => {
                  const avail = getDoctorAvailability(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onPickDoctor(doc.id)}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs ${doctorId === doc.id ? "border-primary bg-primary/10" : "hover:bg-accent"}`}
                    >
                      <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{doc.name}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{doc.specialty} · ₹{doc.fee}</div>
                      </div>
                      {avail !== "present" && <Badge variant="destructive" className="text-[9px]">{avail}</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Visit type + fee */}
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-amber-500/15 text-amber-700"><Ticket className="h-4 w-4" /></div>
            <h3 className="text-sm font-semibold">3 · Visit type & fee</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Visit type</Label>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {VISIT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setVisitType(t.value)}
                    disabled={inferredType === "new" && t.value !== "new" && patientVisitCount === 0}
                    className={`rounded-md border px-2 py-1.5 text-left text-xs disabled:opacity-40 ${visitType === t.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
                  >
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground">{t.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Consultation fee (₹)</Label>
                <Input inputMode="numeric" value={String(fee)} onChange={(e) => setFee(+e.target.value.replace(/\D/g, "") || 0)} className="h-10" />
              </div>
              
              {patient?.insurancePlanId ? (() => {
                const plan = findInsurancePlan(patient.insurancePlanId);
                if (!plan) return null;
                const coverAmt = useInsurance ? Math.min(fee * (plan.coveragePercent / 100), plan.maxCover) : 0;
                const copayAmt = fee - coverAmt;
                return (
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                      <span>Insurance: {plan.providerName}</span>
                      <div className="flex items-center gap-1.5">
                        <input id="useIns" type="checkbox" checked={useInsurance} onChange={(e) => setUseInsurance(e.target.checked)} className="h-3.5 w-3.5" />
                        <label htmlFor="useIns">Apply Insurance</label>
                      </div>
                    </div>
                    {useInsurance && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <div>Coverage ({plan.coveragePercent}%): <b>₹{coverAmt}</b></div>
                          <div>Patient Co-Pay: <b>₹{copayAmt}</b></div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase font-bold">Pre-Auth Reference No.</Label>
                          <Input
                            placeholder="e.g. PRE-AUTH-10294"
                            value={preAuthRef}
                            onChange={(e) => setPreAuthRef(e.target.value)}
                            className="h-8 text-xs mt-0.5 bg-background"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="flex items-center gap-2">
                  <input id="paid" type="checkbox" checked={feePaid} onChange={(e) => setFeePaid(e.target.checked)} className="h-4 w-4" />
                  <Label htmlFor="paid" className="text-xs">Fee collected now (creates paid receipt)</Label>
                </div>
              )}
            </div>
          </div>
        </section>

        <Button size="lg" onClick={submit} disabled={!canRegister} className="w-full h-12 text-base">
          <CheckCircle2 className="mr-2 h-5 w-5" />Create Visit & Generate Token
        </Button>
      </div>

      {/* Side panel: last visit + patient summary */}
      <aside className="space-y-3">
        {lastVisit ? (
          <div key={tick} className="rounded-xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-sm">
            <div className="text-[10px] uppercase tracking-wider text-white/70">Visit registered</div>
            <div className="mt-1 text-lg font-bold">{lastVisit.id}</div>
            <div className="mt-3 rounded-md bg-white/15 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-white/70">Token</div>
              <div className="font-mono text-3xl font-bold">{lastVisit.token}</div>
            </div>
            <div className="mt-3 text-xs text-white/90">
              {findPatient(lastVisit.patientId)?.name} · {doctors.find((d) => d.id === lastVisit.doctorId)?.name}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={() => printSlip(lastVisit.id, "op-slip")}><Printer className="mr-1 h-3.5 w-3.5" />OP Slip</Button>
              <Button size="sm" variant="secondary" onClick={() => printSlip(lastVisit.id, "token")}><Printer className="mr-1 h-3.5 w-3.5" />Token</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-card p-6 text-center text-xs text-muted-foreground">
            Complete the steps to create a visit. Token & OP slip will appear here.
          </div>
        )}

        {patient && (
          <div className="rounded-xl border bg-card p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Patient summary</div>
            <PatientMini patientId={patient.id} />
          </div>
        )}
      </aside>

      <PatientLookup open={lookup} onClose={() => setLookup(false)} onPick={onPickPatient} />
    </div>
  );
}

function PatientMini({ patientId }: { patientId: string }) {
  const s = patientSummary(patientId);
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : "-");
  const rows: [string, string][] = [
    ["Total visits", String(s.totalVisits)],
    ["Last visit", fmt(s.lastVisitAt)],
    ["Last doctor", s.lastDoctor ?? "-"],
    ["Last lab", s.lastLabName ? `${s.lastLabName} · ${fmt(s.lastLabAt)}` : "-"],
    ["Last medicine", s.lastMed ? `${s.lastMed} · ${fmt(s.lastMedAt)}` : "-"],
  ];
  return (
    <ul className="text-xs">
      {rows.map(([k, v]) => (
        <li key={k} className="flex justify-between border-b py-1 last:border-b-0">
          <span className="text-muted-foreground">{k}</span>
          <span className="max-w-[60%] truncate text-right font-medium">{v}</span>
        </li>
      ))}
    </ul>
  );
}
