import { useMemo, useState } from "react";
import { Search, UserPlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  findPatientByQuery, nextMrn, patientSource, findDuplicatePatients,
  patients as patientStore,
  type Patient,
} from "@/lib/mock/data";

const SRC_LABEL = { op: "OP", lab_walkin: "Lab walk-in", pharma_walkin: "Pharma walk-in" } as const;
const SRC_CLS = {
  op: "bg-primary/10 text-primary border-primary/30",
  lab_walkin: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
  pharma_walkin: "bg-status-checkedin/15 text-status-checkedin border-status-checkedin/40",
} as const;

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 864e5)));
}

export function PatientLookup({
  open, onClose, onPick, allowCreate = true,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (p: Patient) => void;
  allowCreate?: boolean;
}) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", age: "", dob: "", gender: "M" as "M" | "F", address: "" });
  const [dupes, setDupes] = useState<Patient[] | null>(null);
  const results = useMemo(() => findPatientByQuery(q).slice(0, 10), [q]);

  const commitCreate = () => {
    const age = form.dob ? ageFromDob(form.dob) : (+form.age || 0);
    const p: Patient = {
      id: `p${Date.now()}`, mrn: nextMrn(), name: form.name.trim(), phone: form.phone,
      age, gender: form.gender, address: form.address, allergies: [],
      createdAt: new Date().toISOString(),
      ...(form.dob ? { dob: form.dob } : {}),
    };
    patientStore.unshift(p);
    onPick(p);
    setCreating(false);
    setForm({ name: "", phone: "", age: "", dob: "", gender: "M", address: "" });
    setDupes(null);
    setQ("");
  };

  const tryCreate = () => {
    if (!form.name.trim() || !/^\d{10}$/.test(form.phone)) return;
    const age = form.dob ? ageFromDob(form.dob) : (+form.age || undefined);
    const matches = findDuplicatePatients({
      phone: form.phone, name: form.name, dob: form.dob || undefined,
      age, gender: form.gender,
    });
    if (matches.length > 0) {
      setDupes(matches);
      return;
    }
    commitCreate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find Patient</DialogTitle>
          <DialogDescription>Search by MRN, mobile number or name. Same ID is used across all modules.</DialogDescription>
        </DialogHeader>

        {!creating && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type name, phone or MRN…" className="h-11 pl-9 text-base" />
            </div>
            <div className="max-h-80 overflow-auto rounded-md border">
              {results.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">{q ? "No matches." : "Start typing to search."}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                    <tr><th className="px-3 py-2">MRN</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Age/Sex</th><th className="px-3 py-2">Mobile</th><th className="px-3 py-2"></th></tr>
                  </thead>
                  <tbody>
                    {results.map((p) => {
                      const src = patientSource(p.id);
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{p.mrn}</td>
                          <td className="px-3 py-2 font-medium">
                            {p.name}
                            <span className={`ml-2 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${SRC_CLS[src]}`}>{SRC_LABEL[src]}</span>
                          </td>
                          <td className="px-3 py-2 text-xs">{p.age}{p.gender}</td>
                          <td className="px-3 py-2 text-xs">{p.phone}</td>
                          <td className="px-3 py-2 text-right"><Button size="sm" onClick={() => onPick(p)}>Select</Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {allowCreate && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreating(true)}><UserPlus className="mr-2 h-4 w-4" />Register New Patient</Button>
              </DialogFooter>
            )}
          </>
        )}

        {creating && !dupes && (
          <div className="space-y-3">
            <div><Label>Full name</Label><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Mobile (10 digit)</Label><Input inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="h-11" /></div>
              <div><Label>DOB (optional)</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="h-11" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Age</Label><Input inputMode="numeric" value={form.dob ? String(ageFromDob(form.dob)) : form.age} disabled={!!form.dob} onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, "") })} className="h-11" /></div>
              <div>
                <Label>Gender</Label>
                <div className="mt-1 flex gap-2">
                  {(["M","F"] as const).map((g) => (
                    <button type="button" key={g} onClick={() => setForm({ ...form, gender: g })} className={`h-11 flex-1 rounded-md border text-sm ${form.gender === g ? "border-primary bg-primary/10 text-primary" : ""}`}>{g === "M" ? "Male" : "Female"}</button>
                  ))}
                </div>
              </div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-11" /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)}>Back</Button>
              <Button onClick={tryCreate} disabled={!form.name.trim() || !/^\d{10}$/.test(form.phone)}>Check & Register</Button>
            </DialogFooter>
          </div>
        )}

        {creating && dupes && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
              <div>
                <div className="font-semibold text-amber-800 dark:text-amber-200">Possible existing patient</div>
                <div className="text-xs text-muted-foreground">Same mobile / name+DOB / name+age matched. Pick an existing profile or register anyway.</div>
              </div>
            </div>
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                  <tr><th className="px-3 py-2">MRN</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Age/Sex</th><th className="px-3 py-2">Mobile</th><th className="px-3 py-2"></th></tr>
                </thead>
                <tbody>
                  {dupes.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{p.mrn}</td>
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-xs">{p.age}{p.gender}</td>
                      <td className="px-3 py-2 text-xs">{p.phone}</td>
                      <td className="px-3 py-2 text-right"><Button size="sm" onClick={() => { onPick(p); setDupes(null); setCreating(false); }}>Use this</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDupes(null)}>Back to form</Button>
              <Button variant="destructive" onClick={commitCreate}>Register anyway</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
