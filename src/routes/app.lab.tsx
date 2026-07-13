import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ScanBarcode, AlertTriangle, CheckCircle2, FlaskConical, FileText, Package, Plus, Trash2, Save, Search,
  Printer, ReceiptText, X, ChevronDown, Check, Eye, Pencil, RotateCcw, HeartPulse,
  ClipboardList, TestTube, Send, XCircle, Barcode as BarcodeIcon, CalendarRange,
  Truck, ShoppingCart, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PatientLookup } from "@/components/patient-lookup";
import { ReportView } from "@/components/report-view";
import { LabTutorialButton } from "@/components/lab-tutorial-dialog";

import type { ReportColumn } from "@/lib/reports/export";
import { getRole } from "@/lib/roles";
import {
  samples as seed, findPatient, invoices, invoiceTotal, testCatalog, labPackages, labPurchases, audit,
  labOrders, pendingTestEdits, accountsSnapshots, nextLabOrderId, persistNow,
  labVendors, reagents, reagentBatches, testBoms, labIndents, labPOs, labGRNs, apEntries,
  consumeReagentsForTest, checkMinMax, createPOFromIndent,
  nextReagentId, nextIndentId, nextGRNId, nextAPId, nextBatchId,
  type Sample, type LabTest, type LabPackage, type Patient, type Invoice, type PatientType, type LabPurchase,
  type LabOrder, type LabOrderStatus, type LabOrderSource, type PendingTestEdit,
  type LabVendor, type Reagent, type LabIndent, type LabPO, type LabPOStatus,
} from "@/lib/mock/data";

type LabTab = "orders" | "collection" | "reagents" | "indents" | "purchases" | "billing" | "bills" | "reports" | "packages" | "analytics";

export const Route = createFileRoute("/app/lab")({
  component: Lab,
  validateSearch: (s: Record<string, unknown>): { tab: LabTab } => {
    const allowed: LabTab[] = ["orders", "collection", "reagents", "indents", "purchases", "billing", "bills", "reports", "packages", "analytics"];
    const t = allowed.includes(s.tab as LabTab) ? (s.tab as LabTab) : "orders";
    return { tab: t };
  },
});

const TAB_TITLE: Record<LabTab, { title: string; subtitle: string }> = {
  orders: { title: "Lab Orders", subtitle: "Intake queue · doctor referrals and walk-in orders" },
  collection: { title: "Sample Collection", subtitle: "Confirm identity · draw samples · print barcodes" },
  reagents: { title: "Reagent Inventory", subtitle: "Stock, batches, expiry & min-max reorder levels" },
  indents: { title: "Indents", subtitle: "Internal purchase requests · pending admin approval" },
  purchases: { title: "Purchases", subtitle: "Purchase orders and goods receipt notes (GRN)" },
  billing: { title: "Lab Billing", subtitle: "Create and print lab bills · GST-exempt healthcare service" },
  bills: { title: "Bills History", subtitle: "View, print, edit or repeat previous lab bills" },
  reports: { title: "Lab Reports", subtitle: "Scan barcodes and enter results · auto-deducts reagents" },
  packages: { title: "Packages & Proposals", subtitle: "Curated bundles · propose test additions/prices" },
  analytics: { title: "Reports & Analytics", subtitle: "Sales, top tests, purchases, accounts sync" },
};

function Lab() {
  const { tab } = Route.useSearch() as { tab: LabTab };
  const nav = useNavigate();
  const setTab = (t: string) => nav({ to: "/app/lab", search: { tab: t as LabTab } });
  const meta = TAB_TITLE[tab];

  return (
    <div className="p-4 lg:p-6">
      <section className="relative mb-4 overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-bold leading-tight">{meta.title}</div>
              <div className="truncate text-xs text-white/80">{meta.subtitle}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LabTutorialButton />
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="orders" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Orders</TabsTrigger>
          <TabsTrigger value="collection" className="gap-1.5"><TestTube className="h-3.5 w-3.5" />Collection</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Reports</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" />Billing</TabsTrigger>
          <TabsTrigger value="bills" className="gap-1.5"><ReceiptText className="h-3.5 w-3.5" />Bills</TabsTrigger>
          <TabsTrigger value="reagents" className="gap-1.5"><Package className="h-3.5 w-3.5" />Reagents</TabsTrigger>
          <TabsTrigger value="indents" className="gap-1.5"><ShoppingCart className="h-3.5 w-3.5" />Indents</TabsTrigger>
          <TabsTrigger value="purchases" className="gap-1.5"><Truck className="h-3.5 w-3.5" />Purchases</TabsTrigger>
          <TabsTrigger value="packages" className="gap-1.5"><Package className="h-3.5 w-3.5" />Packages</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-0"><OrdersTab onGoBilling={() => setTab("billing")} /></TabsContent>
        <TabsContent value="collection" className="mt-0"><CollectionTab /></TabsContent>
        <TabsContent value="reagents" className="mt-0"><ReagentsTab /></TabsContent>
        <TabsContent value="indents" className="mt-0"><IndentsTab /></TabsContent>
        <TabsContent value="purchases" className="mt-0"><PurchasesTab /></TabsContent>
        <TabsContent value="billing" className="mt-0"><BillingTab /></TabsContent>
        <TabsContent value="bills" className="mt-0"><BillsTab onEditGoBilling={() => setTab("billing")} /></TabsContent>
        <TabsContent value="reports" className="mt-0"><ReportsWorkflow /></TabsContent>
        <TabsContent value="packages" className="mt-0"><PackagesTab /></TabsContent>
        <TabsContent value="analytics" className="mt-0"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  );

}

/* ================= helpers ================= */
function openPrint(id: string) {
  window.open(`/print/bill/${id}?format=a5`, "_blank");
}

type BillPrefill = {
  patientId?: string;
  opPatient?: Invoice["opPatient"];
  testCodes: string[];
  pkgIds: string[];
  discount: number;
  editingId?: string;
  orderId?: string;
  patientType: PatientType;
  bed?: string;
};

const PREFILL_KEY = "lab.prefill";

/* ================= Lab Billing ================= */
function BillingTab() {
  const [lookup, setLookup] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientType, setPt] = useState<PatientType>("OP");
  const [bed, setBed] = useState("");
  const [selectedTests, setSelTests] = useState<string[]>([]);
  const [selectedPkgs, setSelPkgs] = useState<string[]>([]);
  const [discount, setDiscount] = useState(0);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [orderId, setOrderId] = useState<string | undefined>(undefined);
  // OP walk-in details
  const [opName, setOpName] = useState("");
  const [opPhone, setOpPhone] = useState("");
  const [opAge, setOpAge] = useState<string>("");
  const [opGender, setOpGender] = useState<"M" | "F" | "Other">("M");

  // Hydrate from prefill (used by Bills > Edit / Repeat)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PREFILL_KEY);
    try {
      const p: BillPrefill = JSON.parse(raw);
      setPt(p.patientType);
      setBed(p.bed ?? "");
      setSelTests(p.testCodes);
      setSelPkgs(p.pkgIds);
      setDiscount(p.discount);
      setEditingId(p.editingId);
      setOrderId(p.orderId);
      if (p.patientId) {
        const pat = findPatient(p.patientId);
        if (pat) setPatient(pat);
      }
      if (p.opPatient) {
        setOpName(p.opPatient.name);
        setOpPhone(p.opPatient.phone);
        setOpAge(p.opPatient.age ? String(p.opPatient.age) : "");
        setOpGender(p.opPatient.gender ?? "M");
      }
      toast.info(p.editingId ? `Editing bill ${p.editingId}` : "Repeat bill prefilled");
    } catch { /* ignore */ }
  }, []);

  const activePkgs = useMemo(() => labPackages.filter((p) => (p.status ?? "active") === "active"), []);

  const lines = useMemo(() => {
    const l: { desc: string; qty: number; rate: number }[] = [];
    selectedPkgs.forEach((id) => {
      const p = labPackages.find((x) => x.id === id); if (p) l.push({ desc: `${p.name} (${p.code})`, qty: 1, rate: p.price });
    });
    selectedTests.forEach((code) => {
      const t = testCatalog.find((x) => x.code === code); if (t) l.push({ desc: `${t.name} (${t.code})`, qty: 1, rate: t.price ?? 0 });
    });
    return l;
  }, [selectedTests, selectedPkgs]);
  const total = lines.reduce((s, l) => s + l.qty * l.rate, 0) - discount;

  const resetForm = () => {
    setPatient(null); setSelTests([]); setSelPkgs([]); setDiscount(0); setBed("");
    setOpName(""); setOpPhone(""); setOpAge(""); setOpGender("M"); setEditingId(undefined); setOrderId(undefined);
  };

  const buildInvoice = (): Invoice | null => {
    if (lines.length === 0) { toast.error("Pick at least one test or package"); return null; }
    const now = new Date().toISOString();
    let pid: string;
    let opPatientMeta: Invoice["opPatient"] | undefined;

    if (patientType === "IP") {
      if (!patient) { toast.error("Find a patient for IP billing"); return null; }
      pid = patient.id;
    } else if (patient) {
      pid = patient.id;
    } else {
      if (!opName.trim() || !opPhone.trim()) { toast.error("Enter patient name and mobile number"); return null; }
      pid = editingId ? invoices.find((i) => i.id === editingId)?.patientId ?? `op-${Date.now()}` : `op-${Date.now()}`;
      opPatientMeta = { name: opName.trim(), phone: opPhone.trim(), age: opAge ? Number(opAge) : undefined, gender: opGender };
    }

    if (editingId) {
      const existing = invoices.find((i) => i.id === editingId);
      if (existing) {
        existing.patientId = pid;
        existing.patientType = patientType;
        existing.bed = patientType === "IP" ? bed : undefined;
        existing.lines = lines;
        existing.discount = discount;
        existing.opPatient = opPatientMeta ?? existing.opPatient;
        existing.audit = [...existing.audit, { at: now, by: "lab", note: `Bill edited · ${patientType}` }];
        return existing;
      }
    }
    const seq = invoices.filter((i) => i.department === "lab").length + 1;
    const inv: Invoice = {
      id: `LAB-${2000 + seq}`, patientId: pid, date: now, department: "lab", billingAccount: "laboratory",
      patientType, bed: patientType === "IP" ? bed : undefined,
      lines, discount, paid: true, opPatient: opPatientMeta,
      audit: [{ at: now, by: "lab", note: `Lab bill · ${patientType}` }],
    };
    invoices.unshift(inv);
    return inv;
  };

  const save = (thenPrint = false) => {
    const inv = buildInvoice();
    if (!inv) return;
    const t = invoiceTotal(inv).total;
    audit("lab", editingId ? "lab_bill_edit" : "lab_bill", { entity: "invoice", entityId: inv.id, meta: { total: t, patientType } });
    if (orderId) {
      const ord = labOrders.find((o) => o.id === orderId);
      if (ord) { ord.invoiceId = inv.id; ord.status = "in_progress"; persistNow(); audit("lab", "order_billed", { entity: "lab_order", entityId: ord.id, meta: { invoiceId: inv.id } }); }
    }
    toast.success(`${inv.id} · ₹${t} · ${patientType}`, {
      action: { label: "Print", onClick: () => openPrint(inv.id) },
    });
    if (thenPrint) openPrint(inv.id);
    resetForm();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">
            {editingId ? <>Editing <span className="font-mono text-emerald-700">{editingId}</span></> : "New Lab Bill"}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border">
              {(["OP","IP"] as PatientType[]).map((t) => (
                <button key={t} onClick={() => setPt(t)} className={`px-4 py-1.5 text-xs font-semibold ${patientType === t ? "bg-emerald-600 text-white" : "hover:bg-accent"}`}>{t === "OP" ? "Out Patient" : "In Patient"}</button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => setLookup(true)}><Search className="mr-1 h-4 w-4" />Find Patient</Button>
            {editingId && <Button size="sm" variant="ghost" onClick={resetForm}>Cancel Edit</Button>}
          </div>
        </div>

        {patient ? (
          <div className="rounded-md border bg-emerald-500/5 p-3 text-sm">
            <b>{patient.name}</b> · {patient.mrn} · {patient.age}{patient.gender} · {patient.phone}
            <Button size="sm" variant="ghost" className="ml-2 h-6 px-2 text-xs" onClick={() => setPatient(null)}>Clear</Button>
          </div>
        ) : patientType === "OP" ? (
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Out-patient details</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div><Label>Patient Name*</Label><Input value={opName} onChange={(e) => setOpName(e.target.value)} placeholder="Full name" className="h-9" /></div>
              <div><Label>Mobile Number*</Label><Input value={opPhone} onChange={(e) => setOpPhone(e.target.value)} placeholder="10-digit mobile" inputMode="tel" className="h-9" /></div>
              <div><Label>Age</Label><Input value={opAge} onChange={(e) => setOpAge(e.target.value)} placeholder="Years" inputMode="numeric" className="h-9" /></div>
              <div>
                <Label>Gender</Label>
                <div className="flex h-9 overflow-hidden rounded-md border">
                  {(["M","F","Other"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setOpGender(g)} className={`flex-1 text-xs font-semibold ${opGender === g ? "bg-emerald-600 text-white" : "hover:bg-accent"}`}>{g}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">Optional: use <b>Find Patient</b> to attach an existing MRN.</div>
          </div>
        ) : (
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            In-patient billing requires an existing patient. Click <b>Find Patient</b>.
          </div>
        )}

        {patientType === "IP" && (
          <div><Label>Bed / Ward</Label><Input value={bed} onChange={(e) => setBed(e.target.value)} placeholder="e.g. Ward-2 / Bed 4" className="h-9" /></div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Packages</div>
            <div className="text-[11px] text-muted-foreground">{selectedPkgs.length} selected</div>
          </div>
          <MultiSelect
            placeholder="Search packages…"
            emptyText="No packages"
            options={activePkgs.map((p) => ({ value: p.id, label: p.name, hint: p.code, right: `₹${p.price}` }))}
            selected={selectedPkgs}
            onChange={setSelPkgs}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Individual Tests</div>
            <div className="text-[11px] text-muted-foreground">{selectedTests.length} selected</div>
          </div>
          <MultiSelect
            placeholder="Search tests by name or code…"
            emptyText="No tests"
            options={testCatalog.map((t) => ({ value: t.code, label: t.name, hint: t.code + (t.unit ? ` · ${t.unit}` : ""), right: `₹${t.price ?? 0}` }))}
            selected={selectedTests}
            onChange={setSelTests}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="text-sm font-semibold">Bill Summary</div>
        <div className="max-h-64 space-y-1 overflow-auto">
          {lines.length === 0 ? <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">Pick tests or a package</div> :
            lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                <span className="truncate">{l.desc}</span>
                <span className="font-mono">₹{l.rate}</span>
              </div>
            ))}
        </div>
        <div>
          <Label>Billing A/c</Label>
          <Input value="Laboratory Billing" disabled className="h-9 bg-muted" />
        </div>
        <div><Label>Discount</Label><Input inputMode="numeric" value={discount} onChange={(e) => setDiscount(+e.target.value || 0)} className="h-9 font-mono" /></div>
        <div className="rounded-lg border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Net</div>
          <div className="font-mono text-3xl font-bold text-emerald-700">₹ {total.toLocaleString("en-IN")}</div>
          <div className="mt-1 text-[10px] leading-tight text-muted-foreground">Healthcare service - GST exempt (Notification 12/2017-CT(Rate))</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => save(false)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="mr-2 h-4 w-4" />{editingId ? "Update" : "Save"}</Button>
          <Button onClick={() => save(true)} variant="outline" className="w-full border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"><Printer className="mr-2 h-4 w-4" />Save & Print</Button>
        </div>
      </div>

      <PatientLookup open={lookup} onClose={() => setLookup(false)} onPick={(p) => { setPatient(p); setLookup(false); }} />
    </div>
  );
}

/* ================= Orders (intake queue) ================= */
const STATUS_LABEL: Record<LabOrderStatus, string> = {
  pending: "Pending", collected: "Collected", in_progress: "In progress",
  resulted: "Resulted", verified: "Verified", dispatched: "Dispatched", cancelled: "Cancelled",
};
const STATUS_CLS: Record<LabOrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/40",
  collected: "bg-sky-500/15 text-sky-700 border-sky-500/40",
  in_progress: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40",
  resulted: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40",
  verified: "bg-emerald-600/20 text-emerald-800 border-emerald-600/40",
  dispatched: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};
const SRC_LABEL: Record<LabOrderSource, string> = { doctor: "Doctor", front_office: "Front Office", walk_in: "OP Walk-in" };

function orderPatientName(o: LabOrder): string {
  if (o.patientId) return findPatient(o.patientId)?.name ?? o.opPatient?.name ?? "-";
  return o.opPatient?.name ?? "-";
}
function orderPatientPhone(o: LabOrder): string {
  if (o.patientId) return findPatient(o.patientId)?.phone ?? o.opPatient?.phone ?? "-";
  return o.opPatient?.phone ?? "-";
}

function OrdersTab({ onGoBilling }: { onGoBilling: () => void }) {
  const [, forceTick] = useState(0);
  const refresh = () => forceTick((n) => n + 1);
  const [status, setStatus] = useState<"active" | LabOrderStatus>("active");
  const [source, setSource] = useState<"all" | LabOrderSource>("all");
  const [q, setQ] = useState("");
  const [addTo, setAddTo] = useState<LabOrder | null>(null);
  const [newOrder, setNewOrder] = useState(false);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return labOrders.filter((o) => {
      if (status === "active") { if (!["pending","collected","in_progress"].includes(o.status)) return false; }
      else if (o.status !== status) return false;
      if (source !== "all" && o.source !== source) return false;
      if (ql) {
        const hit = o.barcode.toLowerCase().includes(ql) || o.id.toLowerCase().includes(ql) ||
          orderPatientName(o).toLowerCase().includes(ql) || orderPatientPhone(o).toLowerCase().includes(ql);
        if (!hit) return false;
      }
      return true;
    });
  }, [status, source, q]);

  const sendToBilling = (o: LabOrder) => {
    if (o.testCodes.length + o.pkgIds.length === 0) { toast.error("Add tests to the order first"); return; }
    const prefill: BillPrefill = {
      patientId: o.patientId, opPatient: o.opPatient,
      testCodes: o.testCodes, pkgIds: o.pkgIds,
      discount: 0, orderId: o.id, patientType: "OP",
    };
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
    onGoBilling();
  };
  const cancel = (o: LabOrder) => {
    if (!confirm(`Cancel order ${o.id}?`)) return;
    o.status = "cancelled"; persistNow();
    audit("lab", "order_cancel", { entity: "lab_order", entityId: o.id });
    toast.success("Order cancelled"); refresh();
  };
  const printLabel = (o: LabOrder) => window.open(`/print/label/${o.id}`, "_blank");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3">
        <div>
          <Label className="text-[11px] uppercase text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active queue</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] uppercase text-muted-foreground">Source</Label>
          <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="doctor">Doctor</SelectItem>
              <SelectItem value="front_office">Front Office</SelectItem>
              <SelectItem value="walk_in">OP Walk-in</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-56">
          <Label className="text-[11px] uppercase text-muted-foreground">Search</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Barcode, order id, patient name or phone" className="h-9" />
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setNewOrder(true)}><Plus className="mr-2 h-4 w-4" />New Walk-in Order</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-emerald-500/5 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Barcode</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Patient</th>
              <th className="px-3 py-2">Mobile</th>
              <th className="px-3 py-2 text-right">Tests</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-xs text-muted-foreground">No orders</td></tr>
            ) : rows.map((o) => (
              <tr key={o.id} className="border-t hover:bg-emerald-500/5">
                <td className="px-3 py-2 font-mono text-xs text-emerald-700">{o.barcode}</td>
                <td className="px-3 py-2 text-xs">{new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{SRC_LABEL[o.source]}</Badge></td>
                <td className="px-3 py-2 font-medium">{orderPatientName(o)}</td>
                <td className="px-3 py-2 text-xs">{orderPatientPhone(o)}</td>
                <td className="px-3 py-2 text-right text-xs">{o.testCodes.length + o.pkgIds.length}</td>
                <td className="px-3 py-2"><Badge className={STATUS_CLS[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" title="Add tests" onClick={() => setAddTo(o)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Print label" onClick={() => printLabel(o)}><BarcodeIcon className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Send to Billing" onClick={() => sendToBilling(o)}><Send className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" title="Cancel" onClick={() => cancel(o)}><XCircle className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddTestsDialog order={addTo} onClose={() => { setAddTo(null); refresh(); }} />
      <NewWalkInDialog open={newOrder} onClose={() => { setNewOrder(false); refresh(); }} />
    </div>
  );
}

function AddTestsDialog({ order, onClose }: { order: LabOrder | null; onClose: () => void }) {
  const [tests, setTests] = useState<string[]>([]);
  const [pkgs, setPkgs] = useState<string[]>([]);
  useEffect(() => {
    if (order) { setTests(order.testCodes); setPkgs(order.pkgIds); }
  }, [order]);
  if (!order) return null;
  const activePkgs = labPackages.filter((p) => (p.status ?? "active") === "active");
  const save = () => {
    order.testCodes = tests; order.pkgIds = pkgs; persistNow();
    audit("lab", "order_edit_tests", { entity: "lab_order", entityId: order.id, meta: { count: tests.length + pkgs.length } });
    toast.success("Tests updated");
    onClose();
  };
  return (
    <Dialog open={!!order} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add tests to <span className="font-mono text-emerald-700">{order.barcode}</span></DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Packages</div>
            <MultiSelect placeholder="Search packages…" emptyText="No packages"
              options={activePkgs.map((p) => ({ value: p.id, label: p.name, hint: p.code, right: `₹${p.price}` }))}
              selected={pkgs} onChange={setPkgs} />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Individual Tests</div>
            <MultiSelect placeholder="Search tests…" emptyText="No tests"
              options={testCatalog.filter((t) => (t as LabTest & { status?: string }).status !== "pending").map((t) => ({ value: t.code, label: t.name, hint: t.code + (t.unit ? ` · ${t.unit}` : ""), right: `₹${t.price ?? 0}` }))}
              selected={tests} onChange={setTests} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={save}><Save className="mr-2 h-4 w-4" />Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewWalkInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [age, setAge] = useState(""); const [gender, setGender] = useState<"M"|"F"|"Other">("M");
  const [tests, setTests] = useState<string[]>([]); const [pkgs, setPkgs] = useState<string[]>([]);
  const reset = () => { setName(""); setPhone(""); setAge(""); setGender("M"); setTests([]); setPkgs([]); };
  const create = () => {
    if (!name.trim() || !phone.trim()) { toast.error("Name and mobile required"); return; }
    const ids = nextLabOrderId();
    labOrders.unshift({
      id: ids.id, barcode: ids.barcode, createdAt: new Date().toISOString(),
      source: "walk_in", opPatient: { name: name.trim(), phone: phone.trim(), age: age ? Number(age) : undefined, gender },
      testCodes: tests, pkgIds: pkgs, status: "pending",
    });
    persistNow();
    audit("lab", "lab_order_create", { entity: "lab_order", entityId: ids.id, meta: { source: "walk_in" } });
    toast.success(`Order ${ids.id} created`);
    reset(); onClose();
  };
  const activePkgs = labPackages.filter((p) => (p.status ?? "active") === "active");
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Walk-in Lab Order</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Name*</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" /></div>
            <div><Label>Mobile*</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="h-9" /></div>
            <div><Label>Age</Label><Input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" className="h-9" /></div>
            <div>
              <Label>Gender</Label>
              <div className="flex h-9 overflow-hidden rounded-md border">
                {(["M","F","Other"] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setGender(g)} className={`flex-1 text-xs font-semibold ${gender === g ? "bg-emerald-600 text-white" : "hover:bg-accent"}`}>{g}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Packages</div>
            <MultiSelect placeholder="Search packages…" emptyText="No packages"
              options={activePkgs.map((p) => ({ value: p.id, label: p.name, hint: p.code, right: `₹${p.price}` }))}
              selected={pkgs} onChange={setPkgs} />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Tests</div>
            <MultiSelect placeholder="Search tests…" emptyText="No tests"
              options={testCatalog.map((t) => ({ value: t.code, label: t.name, hint: t.code, right: `₹${t.price ?? 0}` }))}
              selected={tests} onChange={setTests} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={create}><Plus className="mr-2 h-4 w-4" />Create Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Sample Collection (phlebotomy) ================= */
function CollectionTab() {
  const [, forceTick] = useState(0);
  const refresh = () => forceTick((n) => n + 1);
  const rows = useMemo(() => labOrders.filter((o) => o.status === "pending" && (o.testCodes.length + o.pkgIds.length > 0)), []);
  const markCollected = (o: LabOrder) => {
    o.status = "collected"; o.collectedAt = new Date().toISOString();
    o.collectedBy = (typeof window !== "undefined" ? localStorage.getItem("shifa.username") : null) ?? "lab";
    persistNow();
    audit("lab", "sample_collect", { entity: "lab_order", entityId: o.id });
    toast.success(`Sample collected · ${o.barcode}`, {
      action: { label: "Print label", onClick: () => window.open(`/print/label/${o.id}`, "_blank") },
    });
    refresh();
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
        No pending samples. New orders arrive here once tests are attached.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((o) => {
        const p = o.patientId ? findPatient(o.patientId) : undefined;
        return (
          <div key={o.id} className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-sm font-semibold text-emerald-700">{o.barcode}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })} · {SRC_LABEL[o.source]}</div>
              </div>
              <Badge className={STATUS_CLS[o.status]}>{STATUS_LABEL[o.status]}</Badge>
            </div>
            <div className="rounded-md border bg-emerald-500/5 p-3 text-sm">
              <div className="font-semibold">{orderPatientName(o)}</div>
              <div className="text-xs text-muted-foreground">
                {p ? `${p.mrn} · ${p.age}${p.gender}` : (o.opPatient?.age ? `${o.opPatient.age}${o.opPatient.gender ?? ""}` : "Walk-in")} · {orderPatientPhone(o)}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">To draw</div>
              <div className="flex flex-wrap gap-1">
                {o.pkgIds.map((id) => { const pk = labPackages.find((x) => x.id === id); return pk ? <Badge key={id} className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40">{pk.code}</Badge> : null; })}
                {o.testCodes.map((c) => <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markCollected(o)}>
                <CheckCircle2 className="mr-1 h-4 w-4" />Confirm & Mark Collected
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(`/print/label/${o.id}`, "_blank")}><BarcodeIcon className="h-4 w-4" /></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function MultiSelect({
  options, selected, onChange, placeholder, emptyText,
}: {
  options: { value: string; label: string; hint?: string; right?: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabels = options.filter((o) => selected.includes(o.value));
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 w-full justify-between border-input font-normal">
            <span className="truncate text-sm text-muted-foreground">
              {selected.length === 0 ? placeholder : `${selected.length} selected`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList className="max-h-72">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const on = selected.includes(o.value);
                  return (
                    <CommandItem
                      key={o.value}
                      value={`${o.label} ${o.hint ?? ""}`}
                      onSelect={() => toggle(o.value)}
                      className={on ? "bg-emerald-500/10 text-emerald-700" : ""}
                    >
                      <div className={`mr-2 grid h-4 w-4 place-items-center rounded border ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-input"}`}>
                        {on && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm">{o.label}</div>
                          {o.hint && <div className="truncate text-[11px] text-muted-foreground">{o.hint}</div>}
                        </div>
                        {o.right && <div className="shrink-0 font-mono text-xs">{o.right}</div>}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((o) => (
            <span key={o.value} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700">
              {o.label}
              <button onClick={() => toggle(o.value)} className="grid h-4 w-4 place-items-center rounded-full hover:bg-emerald-600/20"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Bills History ================= */
type BillsRange = "today" | "yesterday" | "7d" | "month" | "custom";

function BillsTab({ onEditGoBilling }: { onEditGoBilling: () => void }) {
  const [range, setRange] = useState<BillsRange>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [pt, setPt] = useState<"all" | "OP" | "IP">("all");
  const [view, setView] = useState<Invoice | null>(null);
  const [, forceTick] = useState(0);

  const inRange = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === "today") return d >= todayStart;
    if (range === "yesterday") {
      const y = new Date(todayStart); y.setDate(y.getDate() - 1);
      return d >= y && d < todayStart;
    }
    if (range === "7d") {
      const w = new Date(todayStart); w.setDate(w.getDate() - 6);
      return d >= w;
    }
    if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (range === "custom") {
      const f = from ? new Date(from + "T00:00:00") : null;
      const t = to ? new Date(to + "T23:59:59") : null;
      if (f && d < f) return false;
      if (t && d > t) return false;
      return true;
    }
    return true;
  };

  const patientName = (i: Invoice) => findPatient(i.patientId)?.name ?? i.opPatient?.name ?? "Walk-in";
  const patientPhone = (i: Invoice) => findPatient(i.patientId)?.phone ?? i.opPatient?.phone ?? "-";

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return invoices
      .filter((i) => i.department === "lab")
      .filter((i) => inRange(i.date))
      .filter((i) => pt === "all" || (i.patientType ?? "OP") === pt)
      .filter((i) => {
        if (!ql) return true;
        return (
          i.id.toLowerCase().includes(ql) ||
          patientName(i).toLowerCase().includes(ql) ||
          patientPhone(i).toLowerCase().includes(ql)
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, from, to, q, pt]);

  const startEdit = (i: Invoice) => {
    const pkgIds: string[] = [];
    const testCodes: string[] = [];
    for (const l of i.lines) {
      const pkg = labPackages.find((p) => l.desc.includes(`(${p.code})`));
      if (pkg) { pkgIds.push(pkg.id); continue; }
      const t = testCatalog.find((tc) => l.desc.includes(`(${tc.code})`));
      if (t) testCodes.push(t.code);
    }
    const prefill: BillPrefill = {
      patientId: i.patientId.startsWith("op-") ? undefined : i.patientId,
      opPatient: i.opPatient,
      testCodes, pkgIds,
      discount: i.discount,
      editingId: i.id,
      patientType: i.patientType ?? "OP",
      bed: i.bed,
    };
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
    onEditGoBilling();
  };

  const startRepeat = (i: Invoice) => {
    const pkgIds: string[] = [];
    const testCodes: string[] = [];
    for (const l of i.lines) {
      const pkg = labPackages.find((p) => l.desc.includes(`(${p.code})`));
      if (pkg) { pkgIds.push(pkg.id); continue; }
      const t = testCatalog.find((tc) => l.desc.includes(`(${tc.code})`));
      if (t) testCodes.push(t.code);
    }
    const prefill: BillPrefill = {
      patientId: i.patientId.startsWith("op-") ? undefined : i.patientId,
      opPatient: i.opPatient,
      testCodes, pkgIds,
      discount: 0,
      patientType: i.patientType ?? "OP",
      bed: i.bed,
    };
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
    onEditGoBilling();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3">
        <div>
          <Label className="text-[11px] uppercase text-muted-foreground">Period</Label>
          <Select value={range} onValueChange={(v) => setRange(v as BillsRange)}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="custom">Custom…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {range === "custom" && (
          <>
            <div><Label className="text-[11px] uppercase text-muted-foreground">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" /></div>
            <div><Label className="text-[11px] uppercase text-muted-foreground">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" /></div>
          </>
        )}
        <div>
          <Label className="text-[11px] uppercase text-muted-foreground">Type</Label>
          <Select value={pt} onValueChange={(v) => setPt(v as typeof pt)}>
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="OP">OP</SelectItem>
              <SelectItem value="IP">IP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-56">
          <Label className="text-[11px] uppercase text-muted-foreground">Search</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Patient name, mobile or invoice #" className="h-9" />
        </div>
        <div className="ml-auto self-end text-xs text-muted-foreground">{rows.length} bill{rows.length === 1 ? "" : "s"}</div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-emerald-500/5 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Patient</th>
              <th className="px-3 py-2">Mobile</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Items</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-xs text-muted-foreground">No bills match your filters</td></tr>
            ) : rows.map((i) => (
              <tr key={i.id} className="border-t hover:bg-emerald-500/5">
                <td className="px-3 py-2 font-mono text-xs text-emerald-700">{i.id}</td>
                <td className="px-3 py-2 text-xs">{new Date(i.date).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-3 py-2 font-medium">{patientName(i)}</td>
                <td className="px-3 py-2 text-xs">{patientPhone(i)}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{i.patientType ?? "OP"}</Badge></td>
                <td className="px-3 py-2 text-right text-xs">{i.lines.length}</td>
                <td className="px-3 py-2 text-right font-mono">₹{invoiceTotal(i).total.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setView(i)} title="View"><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openPrint(i.id)} title="Print"><Printer className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(i)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => startRepeat(i)} title="Repeat"><RotateCcw className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!view} onOpenChange={(v) => { if (!v) setView(null); }}>
        <DialogContent className="max-w-lg">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-emerald-700">{view.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div><b>{patientName(view)}</b> · {patientPhone(view)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(view.date).toLocaleString()} · {view.patientType ?? "OP"}{view.bed ? ` · ${view.bed}` : ""}</div>
                </div>
                <div className="rounded-md border">
                  {view.lines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
                      <span>{l.desc}</span>
                      <span className="font-mono">₹{(l.qty * l.rate).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Discount</span><span className="font-mono">₹{view.discount}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border-2 border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-base font-bold">
                  <span>Total</span><span className="font-mono text-emerald-700">₹{invoiceTotal(view).total.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setView(null); forceTick((x) => x + 1); }}>Close</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openPrint(view.id)}><Printer className="mr-2 h-4 w-4" />Print</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= Lab Reports (results workflow) ================= */
const colByStatus: Record<Sample["status"], string> = {
  pending: "border-status-waiting/40", processing: "border-primary/40", ready: "border-status-checkedin/40",
};
function ReportsWorkflow() {
  const [samples, setSamples] = useState<Sample[]>(seed);
  const [scan, setScan] = useState("");
  const [open, setOpen] = useState<Sample | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmCrit, setConfirmCrit] = useState<{ test: LabTest; value: number } | null>(null);

  const cols = useMemo(() => ({
    pending: samples.filter((s) => s.status === "pending"),
    processing: samples.filter((s) => s.status === "processing"),
    ready: samples.filter((s) => s.status === "ready"),
    stat: samples.filter((s) => s.stat && s.status !== "ready"),
  }), [samples]);

  const openBarcode = () => {
    const s = samples.find((x) => x.barcode.toLowerCase() === scan.trim().toLowerCase());
    if (!s) { toast.error("Sample not found"); return; }
    setOpen(s); setValues({}); setScan("");
  };
  const rangeState = (t: LabTest, v: number) => {
    if (t.critLow !== undefined && v < t.critLow) return "impossible-low";
    if (t.critHigh !== undefined && v > t.critHigh) return "impossible-high";
    if (v < t.low || v > t.high) return "abnormal";
    return "normal";
  };
  const saveResults = () => {
    if (!open) return;
    const parsed: { test: LabTest; value: number }[] = [];
    for (const t of open.tests) {
      const raw = values[t.code]; if (!raw) { toast.error(`Enter ${t.code}`); return; }
      const v = parseFloat(raw); if (Number.isNaN(v)) { toast.error(`Bad ${t.code}`); return; }
      const st = rangeState(t, v);
      if (st === "impossible-low" || st === "impossible-high") { toast.error(`${t.code}: improbable value blocked`); return; }
      parsed.push({ test: t, value: v });
    }
    const crit = parsed.find(({ test, value }) => (test.critLow !== undefined && value <= test.critLow * 1.15) || (test.critHigh !== undefined && value >= test.critHigh * 0.85));
    if (crit && !confirmCrit) { setConfirmCrit(crit); return; }
    // Consume reagents (BOM) for each finalized test
    const blockedAll: { code: string; reagentId: string; reason: string }[] = [];
    for (const { test } of parsed) {
      const res = consumeReagentsForTest(test.code);
      res.blocked.forEach((b) => blockedAll.push({ code: test.code, ...b }));
    }
    if (blockedAll.length > 0) {
      const msg = blockedAll.map((b) => {
        const rg = reagents.find((r) => r.id === b.reagentId);
        return `${b.code} · ${rg?.name ?? b.reagentId} (${b.reason})`;
      }).join("; ");
      toast.error(`Cannot finalize: ${msg}. Receive GRN or replace batch.`);
      return;
    }
    // Trigger min-max auto-indents on affected reagents
    const touched = new Set(parsed.flatMap(({ test }) => testBoms.filter((b) => b.testCode === test.code).map((b) => b.reagentId)));
    touched.forEach((rid) => checkMinMax(rid));
    const reportedAt = new Date().toISOString();
    const updated: Sample = {
      ...open,
      status: "ready" as const,
      reportedAt,
      technicianName: open.technicianName ?? "Lab Technician",
      tests: open.tests.map((t) => ({ ...t, value: parseFloat(values[t.code]) })),
    };
    // Persist to shared samples array so print route can render it
    const idx = seed.findIndex((s) => s.id === open.id);
    if (idx >= 0) seed[idx] = updated;
    persistNow();
    setSamples((prev) => prev.map((s) => s.id === open.id ? updated : s));
    audit("lab", "result_entry", { entity: "sample", entityId: open.barcode, meta: { critical: !!crit } });
    toast.success(`Results saved for ${open.barcode}`);
    // Auto-open the printable report in a new tab
    window.open(`/print/result/${open.id}`, "_blank");
    setOpen(null); setConfirmCrit(null);
  };


  const cardOf = (s: Sample) => {
    const p = findPatient(s.patientId);
    const isReady = s.status === "ready";
    return (
      <div key={s.id} className={`rounded-lg border ${colByStatus[s.status]} bg-card p-3 transition hover:border-emerald-500`}>
        <button onClick={() => { setOpen(s); setValues({}); }} className="w-full text-left">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="font-mono text-sm font-semibold">{s.barcode}</div>
              <div className="truncate text-xs text-muted-foreground">{p?.name} · {p?.mrn}{s.patientType ? ` · ${s.patientType}` : ""}</div>
            </div>
            {s.stat && <Badge className="bg-status-stat/15 text-status-stat border-status-stat/40">STAT</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {s.tests.map((t) => <Badge key={t.code} variant="outline" className="font-mono text-[10px]">{t.code}</Badge>)}
          </div>
        </button>
        {isReady && (
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`/print/result/${s.id}`, "_blank"); }}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-emerald-600 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <Printer className="h-3 w-3" /> Print Report
          </button>
        )}
      </div>
    );
  };


  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-emerald-600" />
            <Input autoFocus placeholder="Scan tube barcode (e.g. LB0001)…" value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => e.key === "Enter" && openBarcode()} className="h-11 font-mono text-base" />
            <Button onClick={openBarcode} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white">Open</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["pending","processing","ready"] as const).map((k) => (
            <div key={k} className="rounded-2xl border bg-card/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase text-muted-foreground">{k}</div>
                <Badge variant="outline">{cols[k].length}</Badge>
              </div>
              <div className="space-y-2">
                {cols[k].length === 0 ? <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">None</div> : cols[k].map(cardOf)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="rounded-2xl border border-status-stat/30 bg-status-stat/5 p-3">
        <div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-status-stat" /><div className="text-xs font-bold uppercase text-status-stat">STAT</div></div>
        <div className="space-y-2">{cols.stat.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : cols.stat.map(cardOf)}</div>
      </aside>

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) { setOpen(null); setConfirmCrit(null); } }}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{open.barcode} <span className="ml-2 font-sans text-sm text-muted-foreground">{findPatient(open.patientId)?.name}</span></DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {open.tests.map((t) => {
                  const raw = values[t.code]; const v = raw ? parseFloat(raw) : NaN;
                  const st = !Number.isNaN(v) ? rangeState(t, v) : null;
                  const cls = st === "impossible-low" || st === "impossible-high" ? "border-destructive ring-2 ring-destructive/40" : st === "abnormal" ? "border-status-waiting ring-2 ring-status-waiting/40" : st === "normal" ? "border-status-checkedin/50" : "";
                  return (
                    <div key={t.code} className="grid grid-cols-[1fr_9rem_5rem] items-center gap-2">
                      <div><div className="text-sm font-medium">{t.name}</div><div className="text-[11px] text-muted-foreground">Ref: {t.low}–{t.high} {t.unit}</div></div>
                      <Input inputMode="decimal" value={raw ?? ""} onChange={(e) => setValues({ ...values, [t.code]: e.target.value })} className={`h-10 font-mono ${cls}`} />
                      <div className="text-xs">
                        {st === "abnormal" && <span className="text-status-waiting">Abnormal</span>}
                        {(st === "impossible-low" || st === "impossible-high") && <span className="text-destructive">Improbable</span>}
                        {st === "normal" && <span className="text-status-normal">Normal</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {confirmCrit && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />Critical value confirmation</div>
                  <div className="mt-1">{confirmCrit.test.name} = <span className="font-mono">{confirmCrit.value}</span> {confirmCrit.test.unit}. Confirm before saving.</div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpen(null); setConfirmCrit(null); }}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveResults}><CheckCircle2 className="mr-2 h-4 w-4" />{confirmCrit ? "Confirm & Save" : "Save Results"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= Packages Master ================= */
function PackagesTab() {
  const role = typeof window !== "undefined" ? getRole() : null;
  const isAdmin = role === "admin";
  const [mode, setMode] = useState<"packages" | "proposals">("packages");
  return (
    <div className="space-y-3">
      <div className="inline-flex gap-1 rounded-xl border bg-muted/30 p-1">
        {(["packages","proposals"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${mode === m ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {m === "packages" ? "Packages" : "Test Proposals"}
          </button>
        ))}
      </div>
      {mode === "packages" ? <PackagesEditor isAdmin={isAdmin} role={role} /> : <TestProposalsPanel isAdmin={isAdmin} role={role} />}
    </div>
  );
}

function PackagesEditor({ isAdmin, role }: { isAdmin: boolean; role: string | null }) {
  const [pkgs, setPkgs] = useState<LabPackage[]>([...labPackages]);
  const [open, setOpen] = useState<LabPackage | "new" | null>(null);
  const empty: LabPackage = { id: `pk${Date.now()}`, code: "", name: "", testCodes: [], price: 0, status: isAdmin ? "active" : "pending" };
  const [form, setForm] = useState<LabPackage>(empty);

  const commit = (next: LabPackage[]) => {
    setPkgs(next);
    labPackages.length = 0; next.forEach((p) => labPackages.push(p));
    persistNow();
  };

  const save = () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error("Code & name required"); return; }
    const stamped: LabPackage = { ...form, status: form.status ?? (isAdmin ? "active" : "pending"), requestedBy: form.requestedBy ?? (role ?? undefined) };
    const found = pkgs.find((x) => x.id === form.id);
    const next = found ? pkgs.map((x) => x.id === form.id ? stamped : x) : [stamped, ...pkgs];
    commit(next);
    audit(isAdmin ? "admin" : "lab", found ? "lab_package_edit" : "lab_package_create", { entity: "lab_package", entityId: stamped.id, meta: { status: stamped.status } });
    toast.success(isAdmin ? "Package saved" : "Sent for admin approval");
    setOpen(null);
  };
  const del = (id: string) => { if (!isAdmin) return; commit(pkgs.filter((x) => x.id !== id)); audit("admin", "lab_package_delete", { entity: "lab_package", entityId: id }); toast.success("Deleted"); };
  const approve = (id: string) => { if (!isAdmin) return; commit(pkgs.map((p) => p.id === id ? { ...p, status: "active" } : p)); audit("admin", "lab_package_approve", { entity: "lab_package", entityId: id }); toast.success("Approved"); };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isAdmin ? "Admin mode · full control" : "Lab mode · new packages need admin approval"}
        </div>
        <Button onClick={() => { setForm({ ...empty, id: `pk${Date.now()}` }); setOpen("new"); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-2 h-4 w-4" />New Package
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-emerald-500/5 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Tests</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {pkgs.map((p) => {
              const status = p.status ?? "active";
              return (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-xs">{p.testCodes.join(", ")}</td>
                  <td className="px-3 py-2">{status === "active" ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40">Active</Badge> : <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40">Pending</Badge>}</td>
                  <td className="px-3 py-2 text-right font-mono">₹{p.price}</td>
                  <td className="px-3 py-2 text-right">
                    {isAdmin && status === "pending" && <Button size="sm" variant="ghost" className="text-emerald-700" onClick={() => approve(p.id)}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>}
                    <Button size="sm" variant="ghost" disabled={!isAdmin && status === "active"} onClick={() => { setForm(p); setOpen(p); }}>Edit</Button>
                    {isAdmin && <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open === "new" ? "New Package" : "Edit Package"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="h-9" /></div>
              <div><Label>Price</Label><Input inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value || 0 })} className="h-9 font-mono" /></div>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" /></div>
            <div>
              <Label>Tests</Label>
              <div className="mt-1">
                <MultiSelect placeholder="Search tests…" emptyText="No tests"
                  options={testCatalog.map((t) => ({ value: t.code, label: t.name, hint: t.code, right: `₹${t.price ?? 0}` }))}
                  selected={form.testCodes} onChange={(v) => setForm({ ...form, testCodes: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={save}><Save className="mr-2 h-4 w-4" />{isAdmin ? "Save" : "Request Approval"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TestProposalsPanel({ isAdmin, role }: { isAdmin: boolean; role: string | null }) {
  const [, forceTick] = useState(0);
  const refresh = () => forceTick((n) => n + 1);
  const [open, setOpen] = useState<null | "new" | { kind: "update" | "delete"; test: LabTest }>(null);
  const [form, setForm] = useState<{ code: string; name: string; unit: string; low: number; high: number; price: number; note: string }>({ code: "", name: "", unit: "", low: 0, high: 0, price: 0, note: "" });

  const submit = (kind: "create" | "update" | "delete", targetCode?: string) => {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Code & name required"); return; }
    const entry: PendingTestEdit = {
      id: `pte${Date.now()}`, requestedBy: role ?? "lab", requestedAt: new Date().toISOString(),
      kind, targetCode, code: form.code.trim().toUpperCase(), name: form.name.trim(),
      unit: form.unit, low: form.low, high: form.high, price: form.price, note: form.note || undefined,
    };
    pendingTestEdits.unshift(entry); persistNow();
    audit("lab", "test_edit_propose", { entity: "test", entityId: entry.code, meta: { kind } });
    toast.success("Sent for admin approval");
    setOpen(null); setForm({ code: "", name: "", unit: "", low: 0, high: 0, price: 0, note: "" });
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isAdmin ? "Admin: review proposals in Settings → Lab" : "Propose new tests, price updates, or removals - admin will review."}
        </div>
        <div className="flex gap-2">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setOpen("new")}><Plus className="mr-2 h-4 w-4" />Propose New Test</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-emerald-500/5 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Kind</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2">Requested</th>
            </tr>
          </thead>
          <tbody>
            {pendingTestEdits.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">No pending proposals</td></tr>
            ) : pendingTestEdits.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2"><Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40">{e.kind}</Badge></td>
                <td className="px-3 py-2 font-mono text-xs">{e.code}</td>
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2 text-right font-mono">₹{e.price}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{e.requestedBy} · {new Date(e.requestedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border bg-card p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Live catalog · click a row to propose a price update or deletion</div>
        <div className="max-h-80 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-2">Code</th><th className="px-2 py-2">Name</th><th className="px-2 py-2 text-right">Price</th><th className="px-2 py-2"></th></tr>
            </thead>
            <tbody>
              {testCatalog.map((t) => (
                <tr key={t.code} className="border-t hover:bg-muted/30">
                  <td className="px-2 py-1 font-mono text-xs">{t.code}</td>
                  <td className="px-2 py-1">{t.name}</td>
                  <td className="px-2 py-1 text-right font-mono">₹{t.price ?? 0}</td>
                  <td className="px-2 py-1 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setForm({ code: t.code, name: t.name, unit: t.unit, low: t.low, high: t.high, price: t.price ?? 0, note: "" }); setOpen({ kind: "update", test: t }); }}>Update</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setForm({ code: t.code, name: t.name, unit: t.unit, low: t.low, high: t.high, price: t.price ?? 0, note: "" }); setOpen({ kind: "delete", test: t }); }}>Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open === "new" ? "Propose New Test" : open && open.kind === "update" ? `Update ${open.test.code}` : open ? `Remove ${open.test.code}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Code</Label><Input value={form.code} disabled={open !== "new"} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="h-9 font-mono" /></div>
              <div><Label>Price ₹</Label><Input inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} className="h-9 font-mono" /></div>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-9" /></div>
              <div><Label>Low</Label><Input value={form.low} onChange={(e) => setForm({ ...form, low: Number(e.target.value) || 0 })} className="h-9 font-mono" /></div>
              <div><Label>High</Label><Input value={form.high} onChange={(e) => setForm({ ...form, high: Number(e.target.value) || 0 })} className="h-9 font-mono" /></div>
            </div>
            <div><Label>Reason / notes</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="h-9" placeholder="Optional context for admin" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => submit(open === "new" ? "create" : (open as { kind: "update"|"delete"; test: LabTest }).kind, open !== "new" ? (open as { kind: string; test: LabTest }).test.code : undefined)}>
              <Save className="mr-2 h-4 w-4" />Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= Reports (analytics + export) ================= */
function AnalyticsTab() {
  const [kind, setKind] = useState<"sales" | "top" | "purchase" | "tat" | "accounts">("sales");
  const labInvs = invoices.filter((i) => i.department === "lab");

  if (kind === "accounts") {
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><AccountsSync /></div>;
  }

  if (kind === "sales") {
    const cols: ReportColumn<Invoice>[] = [
      { key: "id", header: "Invoice" }, { key: "date", header: "Date", accessor: (i) => new Date(i.date).toLocaleDateString() },
      { key: "patient", header: "Patient", accessor: (i) => findPatient(i.patientId)?.name ?? i.opPatient?.name ?? "" },
      { key: "type", header: "Type", accessor: (i) => i.patientType ?? "OP" },
      { key: "items", header: "Items", accessor: (i) => i.lines.map((l) => l.desc).join(" · ") },
      { key: "total", header: "Total", align: "right", accessor: (i) => invoiceTotal(i).total },
    ];
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Lab Sales Report" subtitle="OP + IP lab billings" filename="lab-sales" columns={cols} rows={labInvs} /></div>;
  }
  if (kind === "top") {
    const counts: Record<string, { name: string; count: number; revenue: number }> = {};
    labInvs.forEach((i) => i.lines.forEach((l) => {
      const k = l.desc; counts[k] = counts[k] || { name: k, count: 0, revenue: 0 };
      counts[k].count += l.qty; counts[k].revenue += l.qty * l.rate;
    }));
    const rows = Object.values(counts).sort((a, b) => b.revenue - a.revenue);
    const cols: ReportColumn<typeof rows[number]>[] = [
      { key: "name", header: "Test / Package" }, { key: "count", header: "Count", align: "right" }, { key: "revenue", header: "Revenue ₹", align: "right" },
    ];
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Top Packages & Tests" filename="lab-top" columns={cols} rows={rows} /></div>;
  }
  if (kind === "purchase") {
    const cols: ReportColumn<LabPurchase>[] = [
      { key: "id", header: "ID" }, { key: "date", header: "Date", accessor: (r) => new Date(r.date).toLocaleDateString() },
      { key: "supplier", header: "Supplier" }, { key: "item", header: "Item" },
      { key: "qty", header: "Qty", align: "right" }, { key: "rate", header: "Rate ₹", align: "right" }, { key: "total", header: "Total ₹", align: "right" },
    ];
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Lab Purchase Report" subtitle="Reagents & consumables" filename="lab-purchase" columns={cols} rows={labPurchases} /></div>;
  }
  const tatRows = seed.map((s) => ({ barcode: s.barcode, status: s.status, patient: findPatient(s.patientId)?.name ?? "", tests: s.tests.map((t) => t.code).join(", "), created: new Date(s.createdAt).toLocaleString() }));
  const cols: ReportColumn<typeof tatRows[number]>[] = [
    { key: "barcode", header: "Barcode" }, { key: "patient", header: "Patient" }, { key: "tests", header: "Tests" }, { key: "status", header: "Status" }, { key: "created", header: "Created" },
  ];
  return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Sample TAT Report" filename="lab-tat" columns={cols} rows={tatRows} /></div>;
}

function KindPicker<T extends string>({ kind, onChange }: { kind: T; onChange: (k: T) => void }) {
  const opts = [
    { k: "sales", label: "Sales Report" }, { k: "top", label: "Top Packages / Tests" },
    { k: "purchase", label: "Purchase Report" }, { k: "tat", label: "Sample TAT" },
    { k: "accounts", label: "Sync to Accounts" },
  ];
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border bg-muted/30 p-1">
      {opts.map((o) => <button key={o.k} onClick={() => onChange(o.k as T)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${kind === o.k ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{o.label}</button>)}
    </div>
  );
}

/* ================= Sync to Accounts ================= */
function AccountsSync() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [, forceTick] = useState(0);

  const rows = useMemo(() => {
    const f = new Date(from + "T00:00:00").getTime();
    const t = new Date(to + "T23:59:59").getTime();
    return invoices
      .filter((i) => i.department === "lab")
      .filter((i) => { const ts = new Date(i.date).getTime(); return ts >= f && ts <= t; })
      .map((i) => {
        const gross = i.lines.reduce((s, l) => s + l.qty * l.rate, 0);
        return {
          id: i.id, date: i.date,
          patient: findPatient(i.patientId)?.name ?? i.opPatient?.name ?? "Walk-in",
          type: i.patientType ?? "OP",
          items: i.lines.length, gross, discount: i.discount, net: gross - i.discount,
        };
      });
  }, [from, to]);
  const totals = rows.reduce((a, r) => ({ count: a.count + 1, gross: a.gross + r.gross, discount: a.discount + r.discount, net: a.net + r.net }), { count: 0, gross: 0, discount: 0, net: 0 });

  const send = () => {
    const snap = {
      id: `AS-${Date.now()}`, scope: "lab" as const, from, to,
      createdAt: new Date().toISOString(),
      createdBy: (typeof window !== "undefined" ? localStorage.getItem("shifa.username") : null) ?? "lab",
      totals, rows,
    };
    accountsSnapshots.unshift(snap); persistNow();
    audit("lab", "lab_accounts_sync", { entity: "accounts_snapshot", entityId: snap.id, meta: { count: totals.count, net: totals.net } });
    toast.success("Snapshot sent to Accounts (Admin → Settings → Accounts)");
    forceTick((n) => n + 1);
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label className="text-[11px] uppercase text-muted-foreground">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" /></div>
        <div><Label className="text-[11px] uppercase text-muted-foreground">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" /></div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <div><span className="text-muted-foreground">Bills</span> <b>{totals.count}</b></div>
          <div><span className="text-muted-foreground">Net</span> <b className="font-mono text-emerald-700">₹{totals.net.toLocaleString("en-IN")}</b></div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={send} disabled={totals.count === 0}><Send className="mr-2 h-4 w-4" />Send to Accounts</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-2 py-2">Invoice</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Patient</th><th className="px-2 py-2">Type</th><th className="px-2 py-2 text-right">Items</th><th className="px-2 py-2 text-right">Gross</th><th className="px-2 py-2 text-right">Disc</th><th className="px-2 py-2 text-right">Net</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-xs text-muted-foreground">No lab bills in range</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-2 py-1 font-mono text-xs">{r.id}</td>
                <td className="px-2 py-1 text-xs">{new Date(r.date).toLocaleDateString("en-IN")}</td>
                <td className="px-2 py-1">{r.patient}</td>
                <td className="px-2 py-1 text-xs">{r.type}</td>
                <td className="px-2 py-1 text-right">{r.items}</td>
                <td className="px-2 py-1 text-right font-mono">₹{r.gross}</td>
                <td className="px-2 py-1 text-right font-mono">₹{r.discount}</td>
                <td className="px-2 py-1 text-right font-mono">₹{r.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Snapshot history</div>
        {accountsSnapshots.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">No snapshots sent yet</div>
        ) : (
          <div className="space-y-1">
            {accountsSnapshots.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs">
                <span className="font-mono text-emerald-700">{s.id}</span>
                <span>{s.from} → {s.to}</span>
                <span>{s.totals.count} bills</span>
                <span className="font-mono">₹{s.totals.net.toLocaleString("en-IN")}</span>
                <span className="text-muted-foreground">{new Date(s.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Reagents Inventory ================= */
function stockClass(r: Reagent) {
  if (r.currentStock <= r.minLevel) return "text-destructive font-semibold";
  if (r.currentStock <= r.minLevel * 1.5) return "text-amber-600 font-semibold";
  return "text-emerald-700 font-semibold";
}
function ReagentsTab() {
  const role = typeof window !== "undefined" ? getRole() : null;
  const isAdmin = role === "admin";
  const [, forceTick] = useState(0);
  const refresh = () => forceTick((n) => n + 1);
  const [edit, setEdit] = useState<Reagent | "new" | null>(null);
  const [batchesOf, setBatchesOf] = useState<Reagent | null>(null);
  const [adjust, setAdjust] = useState<Reagent | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const soonCutoff = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const expiringSoon = (rid: string) => reagentBatches.some((b) => b.reagentId === rid && b.remainingQty > 0 && b.expiry <= soonCutoff && b.expiry >= today);
  const anyExpired = (rid: string) => reagentBatches.some((b) => b.reagentId === rid && b.remainingQty > 0 && b.expiry < today);
  const lowCount = reagents.filter((r) => r.currentStock <= r.minLevel).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-3">
        <div className="text-sm">
          <span className="font-semibold">{reagents.length}</span> reagents ·{" "}
          <span className="text-destructive font-semibold">{lowCount}</span> below reorder point
        </div>
        {isAdmin && (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setEdit("new")}>
            <Plus className="mr-2 h-4 w-4" />New Reagent
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-emerald-500/5 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Reagent</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2 text-right">Stock</th>
              <th className="px-3 py-2 text-right">Min / Max</th>
              <th className="px-3 py-2 text-right">Reorder Qty</th>
              <th className="px-3 py-2">Alerts</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reagents.map((r) => {
              const v = labVendors.find((x) => x.id === r.vendorId);
              return (
                <tr key={r.id} className="border-t hover:bg-emerald-500/5">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.unit} · pack {r.packSize}{r.storage ? ` · ${r.storage}` : ""}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{v?.name ?? "-"}</td>
                  <td className={`px-3 py-2 text-right font-mono ${stockClass(r)}`}>{r.currentStock}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.minLevel} / {r.maxLevel}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.reorderQty}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.currentStock <= r.minLevel && <Badge className="bg-destructive/15 text-destructive border-destructive/40">Low</Badge>}
                      {expiringSoon(r.id) && <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40">Expiring 30d</Badge>}
                      {anyExpired(r.id) && <Badge className="bg-destructive/15 text-destructive border-destructive/40">Expired stock</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" title="View batches" onClick={() => setBatchesOf(r)}><Eye className="h-4 w-4" /></Button>
                    {isAdmin && <Button size="sm" variant="ghost" title="Adjust stock" onClick={() => setAdjust(r)}><Pencil className="h-4 w-4" /></Button>}
                    {isAdmin && <Button size="sm" variant="ghost" title="Edit reagent" onClick={() => setEdit(r)}>Edit</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {batchesOf && (
        <Dialog open={!!batchesOf} onOpenChange={(v) => { if (!v) setBatchesOf(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Batches · {batchesOf.name}</DialogTitle></DialogHeader>
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                  <tr><th className="px-2 py-2">Batch</th><th className="px-2 py-2">Lot</th><th className="px-2 py-2">Expiry</th><th className="px-2 py-2 text-right">Received</th><th className="px-2 py-2 text-right">Remaining</th><th className="px-2 py-2 text-right">Cost</th></tr>
                </thead>
                <tbody>
                  {reagentBatches.filter((b) => b.reagentId === batchesOf.id).sort((a, b) => a.expiry.localeCompare(b.expiry)).map((b) => {
                    const expired = b.expiry < today;
                    return (
                      <tr key={b.id} className={`border-t ${expired ? "text-destructive line-through" : ""}`}>
                        <td className="px-2 py-1 font-mono text-xs">{b.batchNo}</td>
                        <td className="px-2 py-1 text-xs">{b.lotNo ?? "-"}</td>
                        <td className="px-2 py-1 text-xs">{b.expiry}{expired ? " · EXPIRED" : ""}</td>
                        <td className="px-2 py-1 text-right">{b.receivedQty}</td>
                        <td className="px-2 py-1 text-right font-semibold">{b.remainingQty}</td>
                        <td className="px-2 py-1 text-right font-mono">₹{b.costPerUnit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {edit !== null && <ReagentEditor initial={edit} onClose={() => { setEdit(null); refresh(); }} />}
      {adjust && <AdjustStockDialog reagent={adjust} onClose={() => { setAdjust(null); refresh(); }} />}
    </div>
  );
}

function ReagentEditor({ initial, onClose }: { initial: Reagent | "new"; onClose: () => void }) {
  const isNew = initial === "new";
  const seedForm: Reagent = isNew
    ? { id: nextReagentId(), name: "", unit: "tests", packSize: 100, currentStock: 0, minLevel: 50, maxLevel: 500, reorderQty: 200, storage: "room", vendorId: labVendors[0]?.id, active: true }
    : { ...(initial as Reagent) };
  const [f, setF] = useState<Reagent>(seedForm);
  const save = () => {
    if (!f.name.trim()) { toast.error("Name required"); return; }
    if (isNew) reagents.unshift(f);
    else {
      const i = reagents.findIndex((r) => r.id === f.id);
      if (i >= 0) reagents[i] = f;
    }
    persistNow();
    audit("admin", isNew ? "reagent_create" : "reagent_edit", { entity: "reagent", entityId: f.id });
    toast.success(isNew ? "Reagent added" : "Reagent updated");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isNew ? "New Reagent" : `Edit ${f.name}`}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-9" /></div>
          <div><Label>Unit</Label><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="h-9" /></div>
          <div><Label>Pack size</Label><Input inputMode="numeric" value={f.packSize} onChange={(e) => setF({ ...f, packSize: +e.target.value || 0 })} className="h-9 font-mono" /></div>
          <div><Label>Current stock</Label><Input inputMode="numeric" value={f.currentStock} onChange={(e) => setF({ ...f, currentStock: +e.target.value || 0 })} className="h-9 font-mono" /></div>
          <div><Label>Storage</Label>
            <Select value={f.storage ?? "room"} onValueChange={(v) => setF({ ...f, storage: v as Reagent["storage"] })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="room">Room</SelectItem><SelectItem value="fridge">Fridge</SelectItem><SelectItem value="freezer">Freezer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Min level</Label><Input inputMode="numeric" value={f.minLevel} onChange={(e) => setF({ ...f, minLevel: +e.target.value || 0 })} className="h-9 font-mono" /></div>
          <div><Label>Max level</Label><Input inputMode="numeric" value={f.maxLevel} onChange={(e) => setF({ ...f, maxLevel: +e.target.value || 0 })} className="h-9 font-mono" /></div>
          <div><Label>Reorder qty</Label><Input inputMode="numeric" value={f.reorderQty} onChange={(e) => setF({ ...f, reorderQty: +e.target.value || 0 })} className="h-9 font-mono" /></div>
          <div className="col-span-2"><Label>Vendor</Label>
            <Select value={f.vendorId ?? ""} onValueChange={(v) => setF({ ...f, vendorId: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>{labVendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={save}><Save className="mr-2 h-4 w-4" />Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustStockDialog({ reagent, onClose }: { reagent: Reagent; onClose: () => void }) {
  const [qty, setQty] = useState<string>("");
  const [reason, setReason] = useState("dead volume");
  const commit = (sign: 1 | -1) => {
    const q = Math.abs(+qty || 0);
    if (q <= 0) { toast.error("Enter a positive quantity"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    reagent.currentStock = Math.max(0, reagent.currentStock + sign * q);
    persistNow();
    audit("admin", "reagent_adjust", { entity: "reagent", entityId: reagent.id, meta: { delta: sign * q, reason } });
    toast.success(`Stock ${sign > 0 ? "added" : "reduced"} by ${q}`);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adjust stock · {reagent.name}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Current stock: <b className="font-mono">{reagent.currentStock}</b></div>
          <div><Label>Quantity</Label><Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 font-mono" /></div>
          <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" placeholder="dead volume / breakage / calibration" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => commit(-1)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Reduce</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => commit(1)}><Plus className="mr-2 h-4 w-4" />Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Indents ================= */
const INDENT_STATUS_CLS: Record<LabIndent["status"], string> = {
  draft: "bg-muted text-muted-foreground border-border",
  submitted: "bg-amber-500/15 text-amber-700 border-amber-500/40",
  approved: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  converted: "bg-sky-500/15 text-sky-700 border-sky-500/40",
};
function IndentsTab() {
  const role = typeof window !== "undefined" ? getRole() : null;
  const isAdmin = role === "admin";
  const [, forceTick] = useState(0);
  const refresh = () => forceTick((n) => n + 1);
  const [newInd, setNewInd] = useState(false);
  const [approve, setApprove] = useState<LabIndent | null>(null);

  const submit = (ind: LabIndent) => {
    ind.status = "submitted"; persistNow();
    audit("lab", "lab_indent_submit", { entity: "lab_indent", entityId: ind.id });
    toast.success(`${ind.id} sent for admin approval`); refresh();
  };
  const reject = (ind: LabIndent) => {
    const reason = prompt("Reject reason?") ?? "";
    ind.status = "rejected"; ind.rejectReason = reason; ind.approvedAt = new Date().toISOString(); ind.approvedBy = "admin";
    persistNow();
    audit("admin", "lab_indent_reject", { entity: "lab_indent", entityId: ind.id, meta: { reason } });
    toast.success("Rejected"); refresh();
  };
  const cancel = (ind: LabIndent) => {
    if (!confirm(`Delete draft ${ind.id}?`)) return;
    const i = labIndents.findIndex((x) => x.id === ind.id);
    if (i >= 0) labIndents.splice(i, 1);
    persistNow(); refresh();
  };

  const active = labIndents.filter((i) => i.status === "draft" || i.status === "submitted");
  const history = labIndents.filter((i) => i.status !== "draft" && i.status !== "submitted");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-3">
        <div className="text-sm">
          <span className="font-semibold">{active.length}</span> active · <span className="text-muted-foreground">{history.length} in history</span>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setNewInd(true)}><Plus className="mr-2 h-4 w-4" />New Indent</Button>
      </div>

      <IndentTable
        title="Drafts & Pending"
        rows={active}
        emptyText="No active indents"
        actions={(ind) => (
          <div className="inline-flex gap-1">
            {ind.status === "draft" && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => submit(ind)}><Send className="mr-1 h-3.5 w-3.5" />Submit</Button>}
            {ind.status === "submitted" && isAdmin && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setApprove(ind)}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>}
            {ind.status === "submitted" && isAdmin && <Button size="sm" variant="outline" className="text-destructive" onClick={() => reject(ind)}><X className="mr-1 h-3.5 w-3.5" />Reject</Button>}
            {ind.status === "draft" && <Button size="sm" variant="ghost" onClick={() => cancel(ind)}><Trash2 className="h-3.5 w-3.5" /></Button>}
          </div>
        )}
      />

      <IndentTable
        title="History"
        rows={history}
        emptyText="No processed indents"
        actions={() => null}
      />

      {newInd && <NewIndentDialog onClose={() => { setNewInd(false); refresh(); }} />}
      {approve && <ApproveIndentDialog ind={approve} onClose={() => { setApprove(null); refresh(); }} />}
    </div>
  );
}

function IndentTable({ title, rows, emptyText, actions }: { title: string; rows: LabIndent[]; emptyText: string; actions: (ind: LabIndent) => React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b bg-emerald-500/5 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
          <tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Items</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th className="px-3 py-2 text-right">Actions</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyText}</td></tr>
          ) : rows.map((ind) => (
            <tr key={ind.id} className="border-t hover:bg-emerald-500/5">
              <td className="px-3 py-2 font-mono text-xs text-emerald-700">{ind.id}</td>
              <td className="px-3 py-2">
                {ind.source === "auto_min_max"
                  ? <Badge className="bg-destructive/10 text-destructive border-destructive/30">Auto - low stock</Badge>
                  : <Badge variant="outline">Manual</Badge>}
              </td>
              <td className="px-3 py-2 text-xs">
                {ind.items.map((it) => {
                  const r = reagents.find((x) => x.id === it.reagentId);
                  return <div key={it.reagentId}>{r?.name ?? it.reagentId} × <b>{it.qty}</b></div>;
                })}
              </td>
              <td className="px-3 py-2"><Badge className={INDENT_STATUS_CLS[ind.status]}>{ind.status}</Badge></td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(ind.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
              <td className="px-3 py-2 text-right">{actions(ind)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewIndentDialog({ onClose }: { onClose: () => void }) {
  const role = typeof window !== "undefined" ? getRole() : null;
  const [rows, setRows] = useState<{ reagentId: string; qty: number }[]>([{ reagentId: reagents[0]?.id ?? "", qty: 100 }]);
  const add = () => setRows([...rows, { reagentId: reagents[0]?.id ?? "", qty: 100 }]);
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const save = (submitNow: boolean) => {
    const items = rows.filter((r) => r.reagentId && r.qty > 0);
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    const ind: LabIndent = {
      id: nextIndentId(),
      createdAt: new Date().toISOString(),
      createdBy: role ?? "lab",
      source: "manual",
      status: submitNow ? "submitted" : "draft",
      items,
    };
    labIndents.unshift(ind); persistNow();
    audit("lab", submitNow ? "lab_indent_submit" : "lab_indent_draft", { entity: "lab_indent", entityId: ind.id });
    toast.success(`${ind.id} ${submitNow ? "submitted" : "saved as draft"}`);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Indent</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem_2rem] gap-2">
              <Select value={r.reagentId} onValueChange={(v) => setRows(rows.map((x, idx) => idx === i ? { ...x, reagentId: v } : x))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{reagents.map((rg) => <SelectItem key={rg.id} value={rg.id}>{rg.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input inputMode="numeric" value={r.qty} onChange={(e) => setRows(rows.map((x, idx) => idx === i ? { ...x, qty: +e.target.value || 0 } : x))} className="h-9 font-mono" />
              <Button variant="ghost" size="sm" onClick={() => remove(i)}><X className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={add}><Plus className="mr-1 h-4 w-4" />Add item</Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => save(false)}>Save as Draft</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => save(true)}><Send className="mr-2 h-4 w-4" />Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApproveIndentDialog({ ind, onClose }: { ind: LabIndent; onClose: () => void }) {
  const [vendorId, setVendorId] = useState(labVendors[0]?.id ?? "");
  const [rates, setRates] = useState<Record<string, { rate: number; gstPct: number }>>(() =>
    Object.fromEntries(ind.items.map((it) => [it.reagentId, { rate: 0, gstPct: 12 }])),
  );
  const approve = () => {
    if (!vendorId) { toast.error("Pick a vendor"); return; }
    ind.status = "approved"; ind.approvedBy = "admin"; ind.approvedAt = new Date().toISOString();
    const po = createPOFromIndent(ind, vendorId, rates);
    persistNow();
    audit("admin", "lab_indent_approve", { entity: "lab_indent", entityId: ind.id, meta: { poId: po.id } });
    toast.success(`Approved · ${po.id} created`);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Approve {ind.id} → Purchase Order</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{labVendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} · {v.gstin}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                <tr><th className="px-2 py-2">Reagent</th><th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Rate ₹</th><th className="px-2 py-2 text-right">GST %</th></tr>
              </thead>
              <tbody>
                {ind.items.map((it) => {
                  const r = reagents.find((x) => x.id === it.reagentId);
                  const val = rates[it.reagentId];
                  return (
                    <tr key={it.reagentId} className="border-t">
                      <td className="px-2 py-1">{r?.name ?? it.reagentId}</td>
                      <td className="px-2 py-1 text-right font-mono">{it.qty}</td>
                      <td className="px-2 py-1 text-right"><Input value={val.rate} onChange={(e) => setRates({ ...rates, [it.reagentId]: { ...val, rate: +e.target.value || 0 } })} className="h-8 w-24 font-mono text-right" /></td>
                      <td className="px-2 py-1 text-right"><Input value={val.gstPct} onChange={(e) => setRates({ ...rates, [it.reagentId]: { ...val, gstPct: +e.target.value || 0 } })} className="h-8 w-16 font-mono text-right" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={approve}><Check className="mr-2 h-4 w-4" />Approve & Create PO</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Purchases (PO + GRN) ================= */
const PO_CLS: Record<LabPOStatus, string> = {
  open: "bg-amber-500/15 text-amber-700 border-amber-500/40",
  partial: "bg-sky-500/15 text-sky-700 border-sky-500/40",
  received: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};
function PurchasesTab() {
  const [, forceTick] = useState(0);
  const refresh = () => forceTick((n) => n + 1);
  const [grn, setGrn] = useState<LabPO | null>(null);
  const [view, setView] = useState<LabPO | null>(null);
  const cancel = (po: LabPO) => {
    if (!confirm(`Cancel ${po.id}?`)) return;
    po.status = "cancelled"; persistNow();
    audit("admin", "lab_po_cancel", { entity: "lab_po", entityId: po.id });
    toast.success("PO cancelled"); refresh();
  };
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b bg-emerald-500/5 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Purchase Orders</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">PO</th><th className="px-3 py-2">Vendor</th><th className="px-3 py-2">Created</th><th className="px-3 py-2 text-right">Items</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {labPOs.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-muted-foreground">No purchase orders</td></tr>
            ) : labPOs.map((po) => {
              const v = labVendors.find((x) => x.id === po.vendorId);
              return (
                <tr key={po.id} className="border-t hover:bg-emerald-500/5">
                  <td className="px-3 py-2 font-mono text-xs text-emerald-700">{po.id}</td>
                  <td className="px-3 py-2">{v?.name ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{new Date(po.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-3 py-2 text-right">{po.items.length}</td>
                  <td className="px-3 py-2 text-right font-mono">₹{po.total.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2"><Badge className={PO_CLS[po.status]}>{po.status}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" title="View" onClick={() => setView(po)}><Eye className="h-4 w-4" /></Button>
                      {po.status !== "received" && po.status !== "cancelled" && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setGrn(po)}><Save className="mr-1 h-3.5 w-3.5" />Receive (GRN)</Button>
                      )}
                      {po.status === "open" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancel(po)}><X className="h-4 w-4" /></Button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b bg-emerald-500/5 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Goods Receipt Notes</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">GRN</th><th className="px-3 py-2">PO</th><th className="px-3 py-2">Received</th><th className="px-3 py-2 text-right">Items</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">AP Entry</th></tr>
          </thead>
          <tbody>
            {labGRNs.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-muted-foreground">No GRNs yet</td></tr>
            ) : labGRNs.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs text-emerald-700">{g.id}</td>
                <td className="px-3 py-2 font-mono text-xs">{g.poId}</td>
                <td className="px-3 py-2 text-xs">{new Date(g.receivedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-3 py-2 text-right">{g.items.length}</td>
                <td className="px-3 py-2 text-right font-mono">₹{g.total.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 font-mono text-xs">{g.apEntryId ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {grn && <GRNDialog po={grn} onClose={() => { setGrn(null); refresh(); }} />}
      {view && (
        <Dialog open onOpenChange={(v) => { if (!v) setView(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-mono">{view.id}</DialogTitle></DialogHeader>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                  <tr><th className="px-2 py-2">Reagent</th><th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Rate</th><th className="px-2 py-2 text-right">GST%</th></tr>
                </thead>
                <tbody>
                  {view.items.map((it, i) => {
                    const r = reagents.find((x) => x.id === it.reagentId);
                    return (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{r?.name ?? it.reagentId}</td>
                        <td className="px-2 py-1 text-right font-mono">{it.qty}</td>
                        <td className="px-2 py-1 text-right font-mono">₹{it.rate}</td>
                        <td className="px-2 py-1 text-right font-mono">{it.gstPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span><span className="font-mono">₹{view.subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>GST</span><span className="font-mono">₹{view.gstTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between rounded border-2 border-emerald-500/40 bg-emerald-500/5 px-3 py-2 font-bold">
              <span>Total</span><span className="font-mono text-emerald-700">₹{view.total.toLocaleString("en-IN")}</span>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function GRNDialog({ po, onClose }: { po: LabPO; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const seven = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const [rows, setRows] = useState(() => po.items.map((it) => ({
    reagentId: it.reagentId, qty: it.qty, batchNo: "", lotNo: "", expiry: "",
    rate: it.rate, gstPct: it.gstPct,
  })));
  const save = () => {
    for (const r of rows) {
      if (r.qty <= 0) { toast.error("Qty must be > 0"); return; }
      if (!r.batchNo.trim()) { toast.error("Batch # required"); return; }
      if (!r.expiry || r.expiry < today) { toast.error("Expiry must be today or later"); return; }
    }
    const grnId = nextGRNId();
    const subtotal = rows.reduce((s, r) => s + r.qty * r.rate, 0);
    const gstTotal = rows.reduce((s, r) => s + (r.qty * r.rate * r.gstPct) / 100, 0);
    const grn: import("@/lib/mock/data").LabGRN = {
      id: grnId, poId: po.id, receivedAt: new Date().toISOString(),
      receivedBy: (typeof window !== "undefined" ? localStorage.getItem("shifa.username") : null) ?? "lab",
      items: rows.map((r) => ({ ...r, lotNo: r.lotNo || undefined })),
      subtotal: Math.round(subtotal * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      total: Math.round((subtotal + gstTotal) * 100) / 100,
    };
    labGRNs.unshift(grn);
    // create batches + increment reagent stock
    for (const r of rows) {
      reagentBatches.unshift({
        id: nextBatchId(), reagentId: r.reagentId, batchNo: r.batchNo, lotNo: r.lotNo || undefined,
        expiry: r.expiry, receivedQty: r.qty, remainingQty: r.qty, grnId,
        costPerUnit: r.rate, gstPct: r.gstPct,
      });
      const reagent = reagents.find((x) => x.id === r.reagentId);
      if (reagent) reagent.currentStock += r.qty;
    }
    // post AP entry
    const ap = {
      id: nextAPId(), sourceType: "lab_grn" as const, sourceId: grnId, vendorId: po.vendorId,
      amount: grn.total, gstAmount: grn.gstTotal, postedAt: new Date().toISOString(), paid: false,
    };
    apEntries.unshift(ap); grn.apEntryId = ap.id;
    // flip PO status
    po.status = "received";
    persistNow();
    audit("lab", "lab_grn_post", { entity: "lab_grn", entityId: grnId, meta: { poId: po.id, total: grn.total, apEntryId: ap.id } });
    toast.success(`${grnId} posted · AP ${ap.id} created`);
    if (rows.some((r) => r.expiry < seven)) toast.warning("Some batches expire within 7 days - verify before use");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Goods Receipt · {po.id}</DialogTitle></DialogHeader>
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-2">Reagent</th><th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2">Batch #</th><th className="px-2 py-2">Lot</th><th className="px-2 py-2">Expiry</th><th className="px-2 py-2 text-right">Rate</th><th className="px-2 py-2 text-right">GST%</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const reagent = reagents.find((x) => x.id === r.reagentId);
                const set = (patch: Partial<typeof r>) => setRows(rows.map((x, idx) => idx === i ? { ...x, ...patch } : x));
                return (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">{reagent?.name ?? r.reagentId}</td>
                    <td className="px-2 py-1 text-right"><Input value={r.qty} onChange={(e) => set({ qty: +e.target.value || 0 })} className="h-8 w-20 font-mono text-right" /></td>
                    <td className="px-2 py-1"><Input value={r.batchNo} onChange={(e) => set({ batchNo: e.target.value })} className="h-8 w-28 font-mono" /></td>
                    <td className="px-2 py-1"><Input value={r.lotNo} onChange={(e) => set({ lotNo: e.target.value })} className="h-8 w-24 font-mono" /></td>
                    <td className="px-2 py-1"><Input type="date" value={r.expiry} onChange={(e) => set({ expiry: e.target.value })} className="h-8 w-36" /></td>
                    <td className="px-2 py-1 text-right"><Input value={r.rate} onChange={(e) => set({ rate: +e.target.value || 0 })} className="h-8 w-20 font-mono text-right" /></td>
                    <td className="px-2 py-1 text-right"><Input value={r.gstPct} onChange={(e) => set({ gstPct: +e.target.value || 0 })} className="h-8 w-14 font-mono text-right" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-muted-foreground">
          Batches auto-create with FEFO consumption. GST paid becomes part of cost (no ITC - lab is GST-exempt on patient side). Accounts Payable entry posts to Admin → Accounts.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={save}><Save className="mr-2 h-4 w-4" />Post GRN</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// silence unused imports referenced only conditionally
void FileText;
void FlaskConical;
void Package;
void ReceiptText;
void CalendarRange;
void labGRNs; void labPOs; void reagents; void labVendors; void reagentBatches; void apEntries; void testBoms; void labIndents;
void consumeReagentsForTest; void checkMinMax;
