import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Pill, Truck, RotateCcw, Plus, Trash2, Save, Search,
  User, X as XIcon, Package, AlertTriangle, CalendarClock, IndianRupee, ReceiptText,
  Printer, Minus, TrendingUp, Stethoscope, ClipboardList, BadgeCheck, FileText,
  Upload, Download, ChevronLeft, ChevronRight, BedDouble, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientLookup } from "@/components/patient-lookup";
import { BillPrintPreview } from "@/components/bill-print-preview";
import { ReportView } from "@/components/report-view";
import type { ReportColumn } from "@/lib/reports/export";
import {
  drugs as seedDrugs, distributors as seedDist, purchases as seedPur, purchaseReturns as seedPR, salesReturns as seedSR,
  doctors as seedDoctors, invoices, invoiceTotal, findPatient, belowReorder, expiringWithin, audit, persistNow,
  getExpiryAlerts, generateAutoReorderList,
  type Drug, type Distributor, type Purchase, type PurchaseReturn, type SalesReturn,
  type PurchaseLine, type Patient, type Invoice, type InvoiceLine,
} from "@/lib/mock/data";

export const Route = createFileRoute("/app/pharmacy")({
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab as string) || "dashboard" }),
  component: Pharmacy,
});

/* ------------- Utility ------------- */
function TallMan({ name }: { name: string }) {
  const parts = name.split(/([A-Z]{2,})/g);
  return <>{parts.map((p, i) => /^[A-Z]{2,}$/.test(p) ? <span key={i} className="tallman">{p}</span> : <span key={i}>{p}</span>)}</>;
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

type Section = "dashboard" | "sales" | "medicines" | "purchase" | "distributors" | "returns" | "reports";

function Pharmacy() {
  const search = useRouterState({ select: (r) => r.location.search }) as { tab?: Section };
  const section: Section = (search?.tab as Section) || "dashboard";
  const goto = (_s: Section) => { /* handled by sidebar links; keep for legacy calls */ };

  return (
    <main className="min-w-0 p-4 lg:p-6">
      {section === "dashboard" && <Dashboard goto={goto} />}
      {section === "sales" && <SalesTab />}
      {section === "medicines" && <MedicinesTab />}
      {section === "purchase" && <PurchaseTab />}
      {section === "distributors" && <DistributorsTab />}
      {section === "returns" && <ReturnsTab />}
      {section === "reports" && <ReportsTab />}
    </main>
  );
}

/* ============================================================
   Dashboard
   ============================================================ */
function Dashboard({ goto }: { goto: (s: Section) => void }) {
  const today = new Date().toDateString();
  const phmInvs = invoices.filter((i) => i.department === "pharmacy");
  const todayInvs = phmInvs.filter((i) => new Date(i.date).toDateString() === today);
  const todaySales = todayInvs.reduce((s, i) => s + invoiceTotal(i).total, 0);
  const stockUnits = seedDrugs.reduce((s, d) => s + d.stock, 0);
  const lowStock = belowReorder().length;
  const expiring = expiringWithin(30).length;
  const activeRx = todayInvs.filter((i) => i.prescribedBy).length || todayInvs.length;

  const todayStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Last 6 months of revenue
  const months = useMemo(() => {
    const arr: { m: string; revenue: number }[] = [];
    const now = new Date();
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const label = d.toLocaleString("en", { month: "short" });
      const rev = phmInvs
        .filter((i) => {
          const id = new Date(i.date);
          return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear();
        })
        .reduce((s, i) => s + invoiceTotal(i).total, 0);
      arr.push({ m: label, revenue: rev });
    }
    // If all zeros, seed a gentle demo curve so the chart isn't flat
    if (arr.every((x) => x.revenue === 0)) {
      const demo = [42, 58, 51, 74, 66, 89];
      arr.forEach((x, i) => (x.revenue = demo[i] * 1000));
    }
    return arr;
  }, [phmInvs]);

  // Inventory distribution by form
  const distribution = useMemo(() => {
    const bag: Record<string, number> = {};
    seedDrugs.forEach((d) => { bag[d.form] = (bag[d.form] || 0) + d.stock; });
    return Object.entries(bag).map(([name, value]) => ({ name, value }));
  }, []);
  const DIST_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  const recent = phmInvs.slice(0, 6);

  const kpis = [
    { label: "Today's Sales", value: inr(todaySales), sub: `${todayInvs.length} bills`, icon: IndianRupee, tint: "from-emerald-500/15 to-emerald-500/0", ring: "text-emerald-600" },
    { label: "Bills Today", value: todayInvs.length, sub: "invoices generated", icon: ReceiptText, tint: "from-sky-500/15 to-sky-500/0", ring: "text-sky-600" },
    { label: "Medicines in Stock", value: stockUnits.toLocaleString("en-IN"), sub: `${seedDrugs.length} SKUs`, icon: Package, tint: "from-indigo-500/15 to-indigo-500/0", ring: "text-indigo-600" },
    { label: "Low-Stock Alerts", value: lowStock, sub: "at/below reorder", icon: AlertTriangle, tint: "from-amber-500/15 to-amber-500/0", ring: "text-amber-600" },
    { label: "Expiring ≤ 30d", value: expiring, sub: "review batches", icon: CalendarClock, tint: "from-rose-500/15 to-rose-500/0", ring: "text-rose-600" },
    { label: "Active Prescriptions", value: activeRx, sub: "today", icon: Stethoscope, tint: "from-teal-500/15 to-teal-500/0", ring: "text-teal-600" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-6 -top-6 opacity-15">
          <Pill className="h-48 w-48" />
        </div>
        <Badge className="mb-3 bg-white/15 text-white hover:bg-white/20"><BadgeCheck className="mr-1 h-3 w-3" />All systems operational</Badge>
        <h1 className="text-2xl font-bold sm:text-3xl">Pharmacy Overview</h1>
        <p className="mt-1 max-w-xl text-sm text-white/85">
          Today &middot; {todayStr}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" className="bg-white text-emerald-700 hover:bg-white/90" onClick={() => goto("reports")}>
            <FileText className="mr-2 h-4 w-4" />Generate Report
          </Button>
          <Button className="bg-emerald-900/40 text-white hover:bg-emerald-900/60" onClick={() => goto("sales")}>
            <Plus className="mr-2 h-4 w-4" />New Sale
          </Button>
          <div className="ml-auto hidden items-center gap-3 text-xs text-white/85 sm:flex">
            <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> {todayInvs.length} transactions today</span>
            <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" /> Compliance: 98%</span>
          </div>
        </div>
      </section>

      {/* KPI tiles */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-xl border bg-gradient-to-b ${k.tint} p-3`}>
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background ${k.ring}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-muted-foreground">{k.label}</div>
            <div className="mt-0.5 font-mono text-xl font-bold">{k.value}</div>
            <div className="text-[10px] text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </section>

      {/* Chart row */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold">Monthly Revenue</div>
              <div className="text-[11px] text-muted-foreground">Pharmacy sales · last 6 months</div>
            </div>
            <Badge variant="outline" className="text-[10px]">Last 6 months</Badge>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <AreaChart data={months} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => inr(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2">
            <div className="text-sm font-semibold">Inventory Distribution</div>
            <div className="text-[11px] text-muted-foreground">Stock by dosage form</div>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="relative h-40 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={distribution} innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                    {distribution.map((_, i) => <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => v.toLocaleString("en-IN")} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Total</div>
                  <div className="font-mono text-lg font-bold">{stockUnits.toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>
            <ul className="space-y-1 text-[11px]">
              {distribution.map((d, i) => (
                <li key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: DIST_COLORS[i % DIST_COLORS.length] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto font-mono">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Expiry & Auto-Reorder Alerts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Expiry Alerts Panel */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-rose-600">
                <CalendarClock className="h-4 w-4" /> Expiry Alert Panel
              </h3>
              <p className="text-[11px] text-muted-foreground">Medicines nearing expiration (within 90 days)</p>
            </div>
            {getExpiryAlerts(90).length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const alerts = getExpiryAlerts(90);
                  const returnLines = alerts.map((item) => ({
                    drugId: item.drug.id,
                    batch: item.drug.batch,
                    expiry: item.drug.expiry,
                    qty: item.drug.stock,
                    rate: Math.round(item.drug.mrp * 0.7),
                    mrp: item.drug.mrp,
                    gst: item.drug.gst || 12,
                  }));
                  const total = returnLines.reduce((s, l) => s + l.qty * l.rate * (1 + l.gst / 100), 0);
                  const pr = {
                    id: `PR-${1000 + seedPR.length + 1}`,
                    purchaseId: "PO-AUTO-RET",
                    date: new Date().toISOString(),
                    lines: returnLines,
                    total,
                    reason: "Automated distributor return for expiring stock",
                  };
                  seedPR.unshift(pr);
                  alerts.forEach((item) => {
                    const d = seedDrugs.find((x) => x.id === item.drug.id);
                    if (d) d.stock = 0;
                  });
                  persistNow();
                  toast.warning(`Generated Distributor Return Slip ${pr.id} for ${returnLines.length} expiring items.`);
                  goto("returns");
                }}
                className="h-8 text-xs font-semibold text-rose-600 border-rose-500/30 hover:bg-rose-500/5"
              >
                Distributor Return Slip
              </Button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {getExpiryAlerts(90).length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-6">
                🎉 No medicines expiring within 90 days.
              </div>
            ) : (
              getExpiryAlerts(90).map((a) => {
                const badgeCls =
                  a.severity === "expired" ? "bg-rose-500/10 text-rose-600 border-rose-500/30" :
                  a.severity === "critical" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" :
                  "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
                return (
                  <div key={a.drug.id} className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0 text-xs">
                    <div>
                      <div className="font-semibold">{a.drug.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Batch: <span className="font-mono">{a.drug.batch}</span> &middot; Stock: {a.drug.stock}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`text-[10px] font-semibold ${badgeCls}`}>
                        {a.daysToExpiry < 0 ? "Expired" : `${a.daysToExpiry} days left`}
                      </Badge>
                      <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">{a.drug.expiry}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Auto-Reorder Panel */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="h-4 w-4" /> Auto-Reorder Alerts
              </h3>
              <p className="text-[11px] text-muted-foreground">Items currently at/below reorder levels</p>
            </div>
            {generateAutoReorderList().length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  const reorderList = generateAutoReorderList();
                  const lines = reorderList.map((item) => ({
                    drugId: item.drug.id,
                    batch: `BAT-AUTO-${Date.now().toString().slice(-4)}`,
                    expiry: new Date(Date.now() + 365 * 864e5).toISOString().split('T')[0],
                    qty: item.suggestedQty,
                    rate: Math.round(item.drug.mrp * 0.7),
                    mrp: item.drug.mrp,
                    gst: item.drug.gst || 12,
                  }));
                  const total = lines.reduce((s, l) => s + l.qty * l.rate * (1 + l.gst / 100), 0);
                  const p = {
                    id: `PO-${1000 + seedPur.length + 1}`,
                    distributorId: seedDist[0]?.id ?? "d1",
                    date: new Date().toISOString(),
                    lines,
                    total,
                  };
                  seedPur.unshift(p);
                  lines.forEach((l) => {
                    const d = seedDrugs.find((x) => x.id === l.drugId);
                    if (d) {
                      d.stock += l.qty;
                      d.batch = l.batch;
                      d.expiry = l.expiry;
                    }
                  });
                  persistNow();
                  toast.success(`Generated Reorder PO ${p.id} successfully! Stock refilled.`);
                  goto("purchase");
                }}
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Generate Purchase Order
              </Button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {generateAutoReorderList().length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-6">
                ✅ All stock levels are within normal limits.
              </div>
            ) : (
              generateAutoReorderList().map((item) => (
                <div key={item.drug.id} className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0 text-xs">
                  <div>
                    <div className="font-semibold">{item.drug.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Current Stock: <span className="font-bold text-rose-500">{item.drug.stock}</span> &middot; Reorder Level: {item.drug.reorderLevel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-amber-600">Order: +{item.suggestedQty}</div>
                    <div className="text-[10px] text-muted-foreground">Est. Cost: ₹{Math.round(item.estimatedCost)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent sales */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-semibold">Recent Sales</div>
          <Button size="sm" variant="ghost" onClick={() => goto("reports")}>View all</Button>
        </div>
        <div className="divide-y">
          {recent.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">No sales yet.</div>}
          {recent.map((i) => {
            const p = findPatient(i.patientId);
            return (
              <div key={i.id} className="flex items-center gap-3 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600"><ReceiptText className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{i.id} · {p?.name ?? "Walk-in"}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{new Date(i.date).toLocaleString()} · {i.lines.length} items</div>
                </div>
                <div className="font-mono text-sm font-semibold">{inr(invoiceTotal(i).total)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   Qty stepper
   ============================================================ */
function QtyStepper({ value, max, onChange, inputRef }: { value: number; max: number; onChange: (v: number) => void; inputRef?: React.RefObject<HTMLInputElement | null> }) {
  const atCap = value >= max;
  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))}
        className="grid h-8 w-8 place-items-center rounded-md border bg-background hover:bg-accent disabled:opacity-40"
        disabled={value <= 1} aria-label="decrease" tabIndex={-1}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(1, +e.target.value || 1)))}
        className="h-8 w-12 rounded-md border bg-background text-center font-mono text-sm"
        inputMode="numeric"
        data-cell="qty"
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-8 w-8 place-items-center rounded-md border bg-background hover:bg-accent disabled:opacity-40"
        disabled={atCap} aria-label="increase" tabIndex={-1}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ============================================================
   Sales & POS (minimalist)
   ============================================================ */
type Row = { drugId: string | null; qty: number; mrp: number; gst: number; query: string };
const EMPTY_ROW: Row = { drugId: null, qty: 1, mrp: 0, gst: 12, query: "" };

function MedicineCell({
  row, rowIdx, isLast, onPick, onChangeQuery, focusCell,
}: {
  row: Row;
  rowIdx: number;
  isLast: boolean;
  onPick: (rowIdx: number, d: Drug) => void;
  onChangeQuery: (rowIdx: number, q: string) => void;
  focusCell: (r: number, c: "med" | "qty" | "mrp" | "gst") => void;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const picked = row.drugId ? seedDrugs.find((d) => d.id === row.drugId) ?? null : null;
  const q = row.query;

  const matches = useMemo(() => {
    if (!q.trim() || picked) return [] as Drug[];
    const s = q.toLowerCase();
    return seedDrugs.filter((d) =>
      d.name.toLowerCase().includes(s) ||
      (d.generic ?? "").toLowerCase().includes(s) ||
      (d.hsn ?? "").includes(s)
    ).slice(0, 6);
  }, [q, picked]);

  useEffect(() => { setHi(0); }, [q]);

  const commit = (d: Drug) => {
    onPick(rowIdx, d);
    setOpen(false);
    setTimeout(() => focusCell(rowIdx, "qty"), 30);
  };

  if (picked) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium"><TallMan name={picked.name} /></div>
          <div className="truncate text-[10px] text-muted-foreground">Stock {picked.stock} · Batch {picked.batch}</div>
        </div>
        <button
          type="button"
          onClick={() => { onChangeQuery(rowIdx, ""); setTimeout(() => inputRef.current?.focus(), 20); }}
          className="rounded-md border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
          tabIndex={-1}
        >Change</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={`phm-cell-${rowIdx}-med`}
        data-cell="med"
        data-row={rowIdx}
        value={q}
        onChange={(e) => { onChangeQuery(rowIdx, e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (matches.length && open) {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(matches.length - 1, h + 1)); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); return; }
            if (e.key === "Enter") { e.preventDefault(); commit(matches[hi]); return; }
          }
          if (e.key === "Enter" && isLast && !q.trim()) e.preventDefault();
        }}
        placeholder={isLast ? "Type medicine name…" : ""}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 top-full z-30 mt-0.5 w-[320px] max-w-[80vw] overflow-hidden rounded-md border bg-card shadow-lg">
          {matches.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commit(d); }}
              onMouseEnter={() => setHi(i)}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${i === hi ? "bg-emerald-500/10" : "hover:bg-accent/40"}`}
            >
              <div className="min-w-0">
                <div className="truncate font-medium"><TallMan name={d.name} /></div>
                <div className="truncate text-[10px] text-muted-foreground">{d.generic ?? "-"} · Stock {d.stock} · ₹{d.mrp}</div>
              </div>
              {d.stock <= 0 && <Badge variant="destructive" className="ml-2 shrink-0 text-[9px]">OOS</Badge>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Sales & POS (row-based grid)
   ============================================================ */
function SalesTab() {
  const [lookup, setLookup] = useState(false);
  const [mode, setMode] = useState<"registered" | "walkin" | "ipd">("registered");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState("");
  const [wardBed, setWardBed] = useState("");
  const [prescribedBy, setPrescribedBy] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [opVisitId, setOpVisitId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }]);
  const [discount, setDiscount] = useState(0);
  const [gstRate, setGstRate] = useState<0 | 5 | 12 | 18>(12);
  const [saving, setSaving] = useState(false);
  const [printId, setPrintId] = useState<string | null>(null);

  const opVisits = useMemo(() => {
    if (!patient) return [] as Invoice[];
    return invoices.filter((i) => i.patientId === patient.id && i.department === "front_office");
  }, [patient]);

  const pickPatient = (p: Patient) => {
    setPatient(p);
    setLookup(false);
    const visits = invoices.filter((i) => i.patientId === p.id && i.department === "front_office")
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
    if (visits.length) {
      setOpVisitId(visits[0].id);
      const doc = seedDoctors.find((d) => d.name === visits[0].doctorName);
      if (doc) setPrescribedBy(doc.id);
    } else { setOpVisitId(""); setPrescribedBy(""); }
  };
  const clearPatient = () => { setPatient(null); setOpVisitId(""); setPrescribedBy(""); };

  const focusCell = (r: number, c: "med" | "qty" | "mrp" | "gst") => {
    const el = document.querySelector<HTMLInputElement>(`[data-row="${r}"][data-cell="${c}"], #phm-cell-${r}-${c}`);
    el?.focus();
    el?.select?.();
  };

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((xs) => xs.map((r, j) => j === i ? { ...r, ...patch } : r));
  };

  const onPick = (i: number, d: Drug) => {
    setRows((xs) => {
      const next = xs.map((r, j) => j === i ? { ...r, drugId: d.id, mrp: d.mrp, gst: d.gst, qty: 1, query: d.name } : r);
      // auto-append if picking last row
      if (i === xs.length - 1) next.push({ ...EMPTY_ROW });
      return next;
    });
  };

  const onChangeQuery = (i: number, q: string) => {
    setRows((xs) => xs.map((r, j) => j === i ? { ...r, drugId: null, query: q } : r));
  };

  const removeRow = (i: number) => {
    setRows((xs) => xs.length <= 1 ? [{ ...EMPTY_ROW }] : xs.filter((_, j) => j !== i));
  };

  const validRows = rows.filter((r) => r.drugId);
  const subtotal = validRows.reduce((s, r) => s + r.mrp * r.qty, 0);
  const taxable = Math.max(0, subtotal - discount);
  const gstAmt = Math.round(taxable * gstRate) / 100;
  const cgst = Math.round((gstAmt / 2) * 100) / 100;
  const sgst = Math.round((gstAmt - cgst) * 100) / 100;
  const totalRaw = taxable + gstAmt;
  const total = Math.round(totalRaw);
  const roundOff = +(total - totalRaw).toFixed(2);

  const doSave = (thenPrint: boolean) => {
    if (validRows.length === 0) { toast.error("Add at least one medicine"); return; }
    if (mode !== "walkin" && !patient) { toast.error("Select a patient or switch to walk-in"); return; }
    if (mode !== "walkin" && !prescribedBy) { toast.error("Prescribing doctor is required"); return; }
    if (mode === "walkin" && !buyerName.trim()) { toast.error("Enter buyer name"); return; }
    if (mode === "ipd" && !wardBed.trim()) { toast.error("Enter ward / bed"); return; }

    for (const r of validRows) {
      const d = seedDrugs.find((x) => x.id === r.drugId)!;
      if (r.qty > d.stock) { toast.error(`${d.name}: only ${d.stock} in stock`); return; }
      if (patient) {
        for (const a of patient.allergies) {
          if (d.name.toLowerCase().includes(a.toLowerCase())) {
            toast.error(`Allergy conflict: ${d.name} vs ${a}`); return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const seq = invoices.filter((i) => i.department === "pharmacy").length + 1;
      const invLines: InvoiceLine[] = validRows.map((r) => {
        const d = seedDrugs.find((x) => x.id === r.drugId)!;
        return {
          desc: d.name,
          qty: r.qty,
          rate: r.mrp,
          drugId: d.id,
          hsn: d.hsn ?? "3004",
          rack: d.rack ?? "-",
          manufacturer: d.manufacturer ?? "-",
          batch: d.batch,
          expiry: d.expiry,
          mrp: r.mrp,
          gst: r.gst,
        };
      });
      const doc = seedDoctors.find((x) => x.id === prescribedBy);
      const buyerNote = mode === "walkin"
        ? `Walk-in · ${buyerName}${buyerMobile ? " · " + buyerMobile : ""} · GST ${gstRate}%`
        : `${mode === "ipd" ? "IPD" : "OPD"} · Rx by ${doc?.name ?? "-"}${wardBed ? " · Bed " + wardBed : ""}${rxNotes ? " · " + rxNotes : ""} · GST ${gstRate}%`;

      const inv: Invoice = {
        id: `PHM-${3000 + seq}`,
        patientId: patient?.id ?? "walkin",
        date: now,
        department: "pharmacy",
        billingAccount: "pharmacy",
        patientType: mode === "ipd" ? "IP" : "OP",
        bed: mode === "ipd" ? wardBed : undefined,
        doctorName: doc?.name,
        prescribedBy: mode !== "walkin" ? prescribedBy : undefined,
        opVisitId: mode !== "walkin" ? (opVisitId || undefined) : undefined,
        lines: invLines,
        discount,
        gstRate,
        paid: true,
        audit: [{ at: now, by: "pharmacy", note: buyerNote }],
      };
      invoices.unshift(inv);
      validRows.forEach((r) => { const d = seedDrugs.find((x) => x.id === r.drugId); if (d) d.stock = Math.max(0, d.stock - r.qty); });
      audit("pharmacy", "sale", {
        entity: "invoice", entityId: inv.id,
        meta: { mrn: patient?.mrn ?? "walkin", buyer: patient?.name ?? buyerName, total, gstRate, items: validRows.length, prescribedBy: doc?.name, opVisitId: inv.opVisitId, mode },
      });
      persistNow();
      toast.success(`${inv.id} saved · ${inr(total)}`);

      setRows([{ ...EMPTY_ROW }]);
      setDiscount(0); setBuyerName(""); setBuyerMobile(""); setWardBed(""); setRxNotes("");
      if (thenPrint) {
        // ensure state settles then open
        setTimeout(() => setPrintId(inv.id), 50);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not save sale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">New Sale</h2>
          <p className="text-xs text-muted-foreground">Pick buyer, then fill medicine rows. Use <kbd className="rounded border bg-muted px-1">Tab</kbd> to move across cells.</p>
        </div>
      </header>

      {/* Buyer segmented toggle */}
      <section className="rounded-xl border bg-card p-4">
        <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-1">
          {([
            { k: "registered", label: "Registered Patient", icon: UserRound },
            { k: "walkin", label: "Walk-in", icon: User },
            { k: "ipd", label: "IPD (In-patient)", icon: BedDouble },
          ] as const).map((m) => (
            <button
              key={m.k}
              onClick={() => { setMode(m.k); if (m.k === "walkin") clearPatient(); }}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                mode === m.k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <m.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.k === "registered" ? "Patient" : m.k === "walkin" ? "Walk-in" : "IPD"}</span>
            </button>
          ))}
        </div>

        {mode === "walkin" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Buyer name *</Label>
              <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Full name" className="h-10" />
            </div>
            <div>
              <Label className="text-xs">Mobile</Label>
              <Input value={buyerMobile} onChange={(e) => setBuyerMobile(e.target.value)} placeholder="10-digit mobile" inputMode="tel" className="h-10" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {patient ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white"><User className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-emerald-900 dark:text-emerald-100">{patient.name} · <span className="font-mono">{patient.mrn}</span></div>
                  <div className="truncate text-[11px] text-emerald-800/80 dark:text-emerald-200/80">
                    {patient.age}{patient.gender} · {patient.phone}
                    {patient.allergies.length > 0 && <> · <span className="font-medium text-rose-600">Allergies: {patient.allergies.join(", ")}</span></>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={clearPatient}><XIcon className="mr-1 h-3.5 w-3.5" />Clear</Button>
                <Button size="sm" variant="outline" onClick={() => setLookup(true)}><Search className="mr-1 h-3.5 w-3.5" />Change</Button>
              </div>
            ) : (
              <button
                onClick={() => setLookup(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-5 text-sm text-muted-foreground hover:border-emerald-500 hover:bg-emerald-500/5 hover:text-emerald-700"
              >
                <Search className="h-4 w-4" /> Find patient by name, mobile or MRN
              </button>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs">Prescribing Doctor *</Label>
                <select value={prescribedBy} onChange={(e) => setPrescribedBy(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">- Select doctor -</option>
                  {seedDoctors.filter((d) => d.active).map((d) => (
                    <option key={d.id} value={d.id}>{d.name} · {d.specialty}</option>
                  ))}
                </select>
              </div>
              {opVisits.length > 0 && (
                <div>
                  <Label className="text-xs">Link OP Visit</Label>
                  <select value={opVisitId} onChange={(e) => setOpVisitId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">- None -</option>
                    {opVisits.map((v) => (
                      <option key={v.id} value={v.id}>{v.id} · {new Date(v.date).toLocaleDateString()} · {v.doctorName ?? "-"}</option>
                    ))}
                  </select>
                </div>
              )}
              {mode === "ipd" && (
                <div>
                  <Label className="text-xs">Ward / Bed *</Label>
                  <Input value={wardBed} onChange={(e) => setWardBed(e.target.value)} placeholder="e.g. Ward-B / Bed 12" className="h-10" />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Rx notes (optional)</Label>
              <Textarea value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} placeholder="Dosage, follow-up, etc." rows={2} />
            </div>
          </div>
        )}
      </section>

      {/* Medicines row grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medicines</div>
            <div className="text-[10px] text-muted-foreground">Tab: move · Enter on medicine: select · Auto-adds new row</div>
          </div>

          <div className="overflow-visible rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="w-10 px-2 py-2 text-center">#</th>
                  <th className="px-2 py-2">Medicine</th>
                  <th className="px-2 py-2 text-center">Qty</th>
                  <th className="px-2 py-2 text-right">MRP ₹</th>
                  <th className="px-2 py-2 text-right">GST %</th>
                  <th className="px-2 py-2 text-right">Amt ₹</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const d = r.drugId ? seedDrugs.find((x) => x.id === r.drugId) ?? null : null;
                  const amt = r.mrp * r.qty;
                  const atCap = d ? r.qty >= d.stock : false;
                  const isLast = i === rows.length - 1;
                  return (
                    <tr key={i} className="border-t align-top">
                      <td className="px-2 py-2 text-center font-mono text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-2">
                        <MedicineCell row={r} rowIdx={i} isLast={isLast}
                          onPick={onPick} onChangeQuery={onChangeQuery} focusCell={focusCell} />
                        {d && atCap && <div className="mt-1 text-[10px] font-medium text-rose-600">Only {d.stock} in stock</div>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {d ? (
                          <QtyStepper value={r.qty} max={d.stock}
                            onChange={(v) => updateRow(i, { qty: v })} />
                        ) : <span className="text-xs text-muted-foreground">-</span>}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input data-row={i} data-cell="mrp" value={r.mrp || ""}
                          onChange={(e) => updateRow(i, { mrp: +e.target.value || 0 })}
                          disabled={!d} inputMode="decimal"
                          className="h-8 w-20 rounded-md border bg-background px-2 text-right font-mono text-sm disabled:opacity-50" />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input data-row={i} data-cell="gst" value={r.gst}
                          onChange={(e) => updateRow(i, { gst: +e.target.value || 0 })}
                          onKeyDown={(e) => {
                            if (e.key === "Tab" && !e.shiftKey && isLast && d) {
                              e.preventDefault();
                              setRows((xs) => [...xs, { ...EMPTY_ROW }]);
                              setTimeout(() => focusCell(i + 1, "med"), 30);
                            }
                          }}
                          disabled={!d} inputMode="numeric"
                          className="h-8 w-16 rounded-md border bg-background px-2 text-right font-mono text-sm disabled:opacity-50" />
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-semibold">{amt ? `₹${amt.toFixed(2)}` : "-"}</td>
                      <td className="px-1 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => removeRow(i)} tabIndex={-1}>
                          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={7} className="p-2">
                    <button
                      type="button"
                      onClick={() => { setRows((xs) => [...xs, { ...EMPTY_ROW }]); setTimeout(() => focusCell(rows.length, "med"), 30); }}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" /> Add row
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Totals */}
        <aside className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" /> Bill Summary
          </div>
          <div>
            <Label className="text-xs">Discount ₹</Label>
            <Input inputMode="numeric" value={discount} onChange={(e) => setDiscount(+e.target.value || 0)} className="h-9 font-mono" />
          </div>
          <div>
            <Label className="text-xs">GST %</Label>
            <select value={gstRate} onChange={(e) => setGstRate(+e.target.value as 0 | 5 | 12 | 18)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value={0}>0% (Exempt)</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
            </select>
          </div>
          <div className="space-y-1 rounded-md bg-muted/30 p-2 text-xs font-mono">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>- ₹{discount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Taxable</span><span>₹{taxable.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>CGST @ {gstRate / 2}%</span><span>₹{cgst.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>SGST @ {gstRate / 2}%</span><span>₹{sgst.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Round off</span><span>{roundOff >= 0 ? "+" : ""}{roundOff.toFixed(2)}</span></div>
          </div>
          <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-3">
            <div className="text-[10px] uppercase text-muted-foreground">Grand Total</div>
            <div className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-400">₹ {total.toLocaleString("en-IN")}</div>
          </div>
        </aside>
      </div>

      {/* Sticky footer actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => { setRows([{ ...EMPTY_ROW }]); setDiscount(0); toast("Cleared"); }}>Cancel</Button>
          <Button variant="outline" onClick={() => doSave(false)} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />Save Sale
          </Button>
          <Button onClick={() => doSave(true)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            <Printer className="mr-2 h-4 w-4" />Save & Print Bill
          </Button>
        </div>
      </div>

      <PatientLookup open={lookup} onClose={() => setLookup(false)} onPick={pickPatient} />
      <BillPrintPreview invoiceId={printId} open={!!printId} onClose={() => setPrintId(null)} defaultFormat="thermal80" />
    </div>
  );
}

/* ============================================================
   Purchase
   ============================================================ */
function PurchaseTab() {
  const [distId, setDistId] = useState(seedDist[0]?.id ?? "");
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [drugId, setDrugId] = useState(seedDrugs[0]?.id ?? "");
  const [form, setForm] = useState({ batch: "", expiry: "", qty: 0, rate: 0, mrp: 0, gst: 12 });

  const add = () => {
    if (!form.batch || !form.expiry || form.qty <= 0 || form.rate <= 0) { toast.error("Fill batch/expiry/qty/rate"); return; }
    setLines((xs) => [...xs, { drugId, ...form }]);
    setForm({ batch: "", expiry: "", qty: 0, rate: 0, mrp: 0, gst: 12 });
  };
  const total = lines.reduce((s, l) => s + l.qty * l.rate * (1 + l.gst / 100), 0);
  const save = () => {
    if (lines.length === 0) { toast.error("Add items"); return; }
    const p: Purchase = { id: `PO-${1000 + seedPur.length + 1}`, distributorId: distId, date: new Date().toISOString(), lines, total };
    seedPur.unshift(p);
    lines.forEach((l) => { const d = seedDrugs.find((x) => x.id === l.drugId); if (d) { d.stock += l.qty; d.batch = l.batch; d.expiry = l.expiry; if (l.mrp) d.mrp = l.mrp; } });
    audit("pharmacy", "purchase", { entity: "purchase", entityId: p.id, meta: { distributorId: distId, total, items: lines.length } });
    toast.success(`${p.id} · ${inr(total)}`);
    setLines([]);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold">New Purchase</div>
        <div><Label>Distributor</Label>
          <select value={distId} onChange={(e) => setDistId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {seedDist.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div><Label>Medicine</Label>
          <select value={drugId} onChange={(e) => setDrugId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {seedDrugs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Batch</Label><Input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className="h-9" /></div>
          <div><Label>Expiry</Label><Input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} className="h-9" /></div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div><Label>Qty</Label><Input inputMode="numeric" value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: +e.target.value || 0 })} className="h-9 font-mono" /></div>
          <div><Label>Rate</Label><Input inputMode="decimal" value={form.rate || ""} onChange={(e) => setForm({ ...form, rate: +e.target.value || 0 })} className="h-9 font-mono" /></div>
          <div><Label>MRP</Label><Input inputMode="decimal" value={form.mrp || ""} onChange={(e) => setForm({ ...form, mrp: +e.target.value || 0 })} className="h-9 font-mono" /></div>
          <div><Label>GST%</Label><Input inputMode="numeric" value={form.gst} onChange={(e) => setForm({ ...form, gst: +e.target.value || 0 })} className="h-9 font-mono" /></div>
        </div>
        <Button onClick={add} variant="outline" className="w-full"><Plus className="mr-2 h-4 w-4" />Add Line</Button>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold">Purchase Lines</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-2 py-1">Item</th><th className="px-2 py-1">Batch</th><th className="px-2 py-1 text-right">Qty</th><th className="px-2 py-1 text-right">Amt</th></tr>
          </thead>
          <tbody>
            {lines.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-xs text-muted-foreground">No lines</td></tr>}
            {lines.map((l, i) => {
              const d = seedDrugs.find((x) => x.id === l.drugId);
              return (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1 text-xs">{d?.name}</td>
                  <td className="px-2 py-1 text-xs font-mono">{l.batch}</td>
                  <td className="px-2 py-1 text-right font-mono">{l.qty}</td>
                  <td className="px-2 py-1 text-right font-mono">₹{Math.round(l.qty * l.rate * (1 + l.gst / 100))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Grand Total (incl. GST)</div>
          <div className="font-mono text-2xl font-bold text-primary">₹ {Math.round(total).toLocaleString("en-IN")}</div>
        </div>
        <Button onClick={save} className="w-full"><Save className="mr-2 h-4 w-4" />Save Purchase</Button>
      </div>
    </div>
  );
}

/* ============================================================
   Returns (Purchase + Sales)
   ============================================================ */
function ReturnsTab() {
  const [tab, setTab] = useState<"purchase" | "sales">("purchase");
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border bg-muted/30 p-1">
        {(["purchase", "sales"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {k === "purchase" ? "Purchase Return" : "Sales Return"}
          </button>
        ))}
      </div>
      {tab === "purchase" ? <PurchaseReturnTab /> : <SalesReturnTab />}
    </div>
  );
}

function PurchaseReturnTab() {
  const [purchaseId, setPid] = useState(seedPur[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const purchase = seedPur.find((p) => p.id === purchaseId);
  const [selected, setSelected] = useState<Record<number, number>>({});

  const doReturn = () => {
    if (!purchase) { toast.error("No purchase selected"); return; }
    const chosen = Object.entries(selected).filter(([, q]) => q > 0);
    if (chosen.length === 0) { toast.error("Pick items"); return; }
    const returnLines: PurchaseLine[] = chosen.map(([idx, q]) => ({ ...purchase.lines[+idx], qty: q }));
    const total = returnLines.reduce((s, l) => s + l.qty * l.rate * (1 + l.gst / 100), 0);
    const pr: PurchaseReturn = { id: `PR-${1000 + seedPR.length + 1}`, purchaseId, date: new Date().toISOString(), lines: returnLines, total, reason };
    seedPR.unshift(pr);
    returnLines.forEach((l) => { const d = seedDrugs.find((x) => x.id === l.drugId); if (d) d.stock = Math.max(0, d.stock - l.qty); });
    audit("pharmacy", "purchase_return", { entity: "purchase_return", entityId: pr.id, meta: { purchaseId, total, reason } });
    toast.success(`${pr.id} · ${inr(total)}`);
    setSelected({}); setReason("");
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold">Select Purchase to Return</div>
        <select value={purchaseId} onChange={(e) => { setPid(e.target.value); setSelected({}); }} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">- pick -</option>
          {seedPur.map((p) => <option key={p.id} value={p.id}>{p.id} · {seedDist.find((d) => d.id === p.distributorId)?.name} · ₹{Math.round(p.total)}</option>)}
        </select>
        {!purchase && <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">No purchases yet · create one first.</div>}
        <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged / Expiry / Wrong item" className="h-9" /></div>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold">Lines</div>
        {purchase && (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-1">Item</th><th className="px-2 py-1">Batch</th><th className="px-2 py-1 text-right">Purchased</th><th className="px-2 py-1 text-right">Return Qty</th></tr>
            </thead>
            <tbody>
              {purchase.lines.map((l, i) => {
                const d = seedDrugs.find((x) => x.id === l.drugId);
                return (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1 text-xs">{d?.name}</td>
                    <td className="px-2 py-1 text-xs font-mono">{l.batch}</td>
                    <td className="px-2 py-1 text-right font-mono">{l.qty}</td>
                    <td className="px-2 py-1 text-right"><Input value={selected[i] ?? 0} onChange={(e) => setSelected({ ...selected, [i]: Math.min(l.qty, +e.target.value || 0) })} className="h-8 w-20 text-right font-mono" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Button onClick={doReturn} disabled={!purchase} className="w-full"><RotateCcw className="mr-2 h-4 w-4" />Process Return</Button>
      </div>
    </div>
  );
}

function SalesReturnTab() {
  const phmInvs = invoices.filter((i) => i.department === "pharmacy");
  const [invId, setInvId] = useState(phmInvs[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const inv = phmInvs.find((i) => i.id === invId);
  const [selected, setSelected] = useState<Record<number, number>>({});

  const doReturn = () => {
    if (!inv) { toast.error("Pick an invoice"); return; }
    const chosen = Object.entries(selected).filter(([, q]) => q > 0);
    if (chosen.length === 0) { toast.error("Pick items"); return; }
    const lines: InvoiceLine[] = chosen.map(([idx, q]) => ({ ...inv.lines[+idx], qty: q }));
    const total = lines.reduce((s, l) => s + l.qty * l.rate, 0);
    const sr: SalesReturn = { id: `SR-${1000 + seedSR.length + 1}`, invoiceId: inv.id, date: new Date().toISOString(), lines, total, reason };
    seedSR.unshift(sr);
    lines.forEach((l) => { const d = seedDrugs.find((x) => x.name === l.desc); if (d) d.stock += l.qty; });
    audit("pharmacy", "sales_return", { entity: "sales_return", entityId: sr.id, meta: { invoiceId: inv.id, total, reason } });
    toast.success(`${sr.id} · ₹${total}`);
    setSelected({}); setReason("");
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold">Select Sale to Return</div>
        <select value={invId} onChange={(e) => { setInvId(e.target.value); setSelected({}); }} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">- pick -</option>
          {phmInvs.map((i) => <option key={i.id} value={i.id}>{i.id} · {findPatient(i.patientId)?.name ?? "Walk-in"} · ₹{invoiceTotal(i).total}</option>)}
        </select>
        <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" /></div>
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold">Lines</div>
        {inv && (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-1">Item</th><th className="px-2 py-1 text-right">Sold</th><th className="px-2 py-1 text-right">Return Qty</th></tr>
            </thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1 text-xs">{l.desc}</td>
                  <td className="px-2 py-1 text-right font-mono">{l.qty}</td>
                  <td className="px-2 py-1 text-right"><Input value={selected[i] ?? 0} onChange={(e) => setSelected({ ...selected, [i]: Math.min(l.qty, +e.target.value || 0) })} className="h-8 w-20 text-right font-mono" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Button onClick={doReturn} disabled={!inv} className="w-full"><RotateCcw className="mr-2 h-4 w-4" />Process Return</Button>
      </div>
    </div>
  );
}

/* ============================================================
   Distributors
   ============================================================ */
function DistributorsTab() {
  const [rows, setRows] = useState<Distributor[]>(seedDist);
  const [open, setOpen] = useState<Distributor | "new" | null>(null);
  const empty: Distributor = { id: `ds${Date.now()}`, name: "", gstin: "", contact: "", address: "", openingBalance: 0 };
  const [form, setForm] = useState<Distributor>(empty);

  const save = () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setRows((xs) => {
      const found = xs.find((x) => x.id === form.id);
      const next = found ? xs.map((x) => x.id === form.id ? form : x) : [form, ...xs];
      seedDist.length = 0; next.forEach((d) => seedDist.push(d));
      return next;
    });
    setOpen(null); toast.success("Saved");
  };
  const del = (id: string) => { const next = rows.filter((x) => x.id !== id); setRows(next); seedDist.length = 0; next.forEach((d) => seedDist.push(d)); };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => { setForm({ ...empty, id: `ds${Date.now()}` }); setOpen("new"); }}><Plus className="mr-2 h-4 w-4" />Add Distributor</Button></div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">GSTIN</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Address</th><th className="px-3 py-2 text-right">Opening Bal</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2 font-medium">{d.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{d.gstin}</td>
                <td className="px-3 py-2 text-xs">{d.contact}</td>
                <td className="px-3 py-2 text-xs">{d.address}</td>
                <td className="px-3 py-2 text-right font-mono">₹{d.openingBalance}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setForm(d); setOpen(d); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open === "new" ? "New Distributor" : "Edit Distributor"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="h-9 font-mono" /></div>
              <div><Label>Contact</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="h-9" /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-9" /></div>
            <div><Label>Opening Balance</Label><Input inputMode="decimal" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: +e.target.value || 0 })} className="h-9 font-mono" /></div>
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

/* ============================================================
   Medicines master (Inventory)
   ============================================================ */
function MedicinesTab() {
  const [rows, setRows] = useState<Drug[]>(seedDrugs);
  const [open, setOpen] = useState<Drug | "new" | null>(null);
  const empty: Drug = { id: `d${Date.now()}`, name: "", form: "Tablet", generic: "", hsn: "3004", rack: "", manufacturer: "", unit: "", stock: 0, batch: "", expiry: "", mrp: 0, gst: 12, reorderLevel: 0 };
  const [form, setForm] = useState<Drug>(empty);
  const [expiryView, setExpiryView] = useState(false);

  const save = () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setRows((xs) => {
      const found = xs.find((x) => x.id === form.id);
      const next = found ? xs.map((x) => x.id === form.id ? form : x) : [form, ...xs];
      seedDrugs.length = 0; next.forEach((d) => seedDrugs.push(d));
      persistNow();
      return next;
    });
    setOpen(null); toast.success("Saved");
  };
  const del = (id: string) => { const next = rows.filter((x) => x.id !== id); setRows(next); seedDrugs.length = 0; next.forEach((d) => seedDrugs.push(d)); };

  const [importOpen, setImportOpen] = useState(false);

  const applyImport = (added: Drug[]) => {
    setRows((xs) => {
      const map = new Map(xs.map((d) => [d.name.toLowerCase(), d]));
      added.forEach((n) => {
        const existing = map.get(n.name.toLowerCase());
        if (existing) {
          existing.stock += n.stock;
          if (n.mrp) existing.mrp = n.mrp;
          if (n.batch) existing.batch = n.batch;
          if (n.expiry) existing.expiry = n.expiry;
          if (n.gst) existing.gst = n.gst;
          if (n.hsn) existing.hsn = n.hsn;
          if (n.rack) existing.rack = n.rack;
          if (n.manufacturer) existing.manufacturer = n.manufacturer;
          if (n.unit) existing.unit = n.unit;
          if (n.form) existing.form = n.form;
          if (n.generic) existing.generic = n.generic;
          if (n.reorderLevel) existing.reorderLevel = n.reorderLevel;
        }
        else map.set(n.name.toLowerCase(), n);
      });
      const next = Array.from(map.values());
      seedDrugs.length = 0; next.forEach((d) => seedDrugs.push(d));
      persistNow();
      return next;
    });
    toast.success(`Imported ${added.length} medicines`);
    setImportOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-3 rounded-xl border">
        <div className="flex items-center gap-1.5 border rounded-lg p-1 bg-muted/50">
          <button
            type="button"
            onClick={() => setExpiryView(false)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${!expiryView ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Standard View
          </button>
          <button
            type="button"
            onClick={() => setExpiryView(true)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${expiryView ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Batch-wise Expiry View
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Import from Excel</Button>
          <Button size="sm" onClick={() => { setForm({ ...empty, id: `d${Date.now()}` }); setOpen("new"); }}><Plus className="mr-2 h-4 w-4" />Add Medicine</Button>
        </div>
      </div>
      <ImportDrugsDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={applyImport} />
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            {expiryView ? (
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Batch</th>
                <th className="px-3 py-2">Expiry Date</th>
                <th className="px-3 py-2 text-right">Days Left</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right">MRP</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            ) : (
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Generic</th>
                <th className="px-3 py-2">Form</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right">MRP</th>
                <th className="px-3 py-2 text-right">Reorder</th>
                <th className="px-3 py-2"></th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((d) => {
              if (expiryView) {
                const exp = new Date(d.expiry).getTime();
                const daysLeft = Math.floor((exp - Date.now()) / 864e5);
                const status = 
                  daysLeft < 0 ? { label: "Expired", cls: "bg-rose-500/10 text-rose-600 border-rose-500/30" } :
                  daysLeft <= 30 ? { label: "Critical", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" } :
                  daysLeft <= 90 ? { label: "Warning", cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" } :
                  { label: "Safe", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" };

                return (
                  <tr key={d.id} className="border-t hover:bg-muted/10 transition">
                    <td className="px-3 py-2 font-medium"><TallMan name={d.name} /></td>
                    <td className="px-3 py-2 font-mono text-xs">{d.batch || "—"}</td>
                    <td className="px-3 py-2 text-xs font-mono">{d.expiry || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {daysLeft < 0 ? <span className="text-rose-600 font-bold">Expired</span> : daysLeft}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{d.stock}</td>
                    <td className="px-3 py-2 text-right font-mono">₹{d.mrp}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setForm(d); setOpen(d); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => del(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                );
              } else {
                return (
                  <tr key={d.id} className={`border-t ${d.stock <= d.reorderLevel ? "bg-status-waiting/10" : ""}`}>
                    <td className="px-3 py-2 font-medium"><TallMan name={d.name} /></td>
                    <td className="px-3 py-2 text-xs">{d.generic}</td>
                    <td className="px-3 py-2 text-xs">{d.form}</td>
                    <td className="px-3 py-2 text-right font-mono">{d.stock}</td>
                    <td className="px-3 py-2 text-right font-mono">₹{d.mrp}</td>
                    <td className="px-3 py-2 text-right font-mono">{d.reorderLevel}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setForm(d); setOpen(d); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => del(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open === "new" ? "New Medicine" : "Edit Medicine"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label>Name (use CAPS for TallMan segments)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Generic / Content</Label><Input value={form.generic} onChange={(e) => setForm({ ...form, generic: e.target.value })} className="h-9" /></div>
              <div><Label>Form</Label><Input value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>HSN</Label><Input value={form.hsn ?? ""} onChange={(e) => setForm({ ...form, hsn: e.target.value })} className="h-9 font-mono" /></div>
              <div><Label>Rack</Label><Input value={form.rack ?? ""} onChange={(e) => setForm({ ...form, rack: e.target.value })} className="h-9" /></div>
              <div><Label>Unit</Label><Input value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-9" /></div>
            </div>
            <div><Label>Manufacturer</Label><Input value={form.manufacturer ?? ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="h-9" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Stock</Label><Input inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value || 0 })} className="h-9 font-mono" /></div>
              <div><Label>MRP</Label><Input inputMode="decimal" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: +e.target.value || 0 })} className="h-9 font-mono" /></div>
              <div><Label>Reorder Level</Label><Input inputMode="numeric" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: +e.target.value || 0 })} className="h-9 font-mono" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Batch</Label><Input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className="h-9" /></div>
              <div><Label>Expiry</Label><Input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} className="h-9" /></div>
              <div><Label>GST %</Label><Input inputMode="numeric" value={form.gst} onChange={(e) => setForm({ ...form, gst: +e.target.value || 0 })} className="h-9 font-mono" /></div>
            </div>
            <div><Label>LASA (sound-alike)</Label><Input value={form.lasa ?? ""} onChange={(e) => setForm({ ...form, lasa: e.target.value })} className="h-9" /></div>
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

/* ============================================================
   Reports
   ============================================================ */
function ReportsTab() {
  const [kind, setKind] = useState<"sales" | "purchase" | "content" | "stock" | "reorder" | "expiry">("sales");
  const [printId, setPrintId] = useState<string | null>(null);
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const phmInvs = invoices.filter((i) => i.department === "pharmacy");

  if (kind === "sales") {
    const filtered = doctorFilter === "all" ? phmInvs : phmInvs.filter((i) => i.prescribedBy === doctorFilter);
    const cols: ReportColumn<Invoice>[] = [
      { key: "id", header: "Invoice" },
      { key: "date", header: "Date", accessor: (i) => new Date(i.date).toLocaleDateString() },
      { key: "patient", header: "Patient", accessor: (i) => findPatient(i.patientId)?.name ?? "Walk-in" },
      { key: "doctor", header: "Prescribing Dr.", accessor: (i) => i.doctorName ?? "-" },
      { key: "opVisit", header: "OP Visit", accessor: (i) => i.opVisitId ?? "-" },
      { key: "items", header: "Items", accessor: (i) => i.lines.map((l) => `${l.desc} × ${l.qty}`).join(" · ") },
      { key: "total", header: "Total", align: "right", accessor: (i) => invoiceTotal(i).total },
      { key: "print", header: "", accessor: () => "" },
    ];
    return (
      <div className="space-y-3">
        <KindPicker kind={kind} onChange={setKind} />
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter by Doctor</span>
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="h-9 w-64">
              <SelectValue placeholder="All doctors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All doctors</SelectItem>
              {seedDoctors.filter((d) => d.active).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "invoice" : "invoices"}</span>
        </div>
        <ReportView title="Pharmacy Sales Report" filename="phm-sales" columns={cols} rows={filtered} />
        <div className="rounded-xl border bg-card">
          <div className="border-b p-3 text-sm font-semibold">Reprint any bill</div>
          <div className="divide-y">
            {filtered.slice(0, 10).map((i) => (
              <div key={i.id} className="flex items-center justify-between p-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{i.id} · {findPatient(i.patientId)?.name ?? "Walk-in"}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{new Date(i.date).toLocaleString()} · {inr(invoiceTotal(i).total)}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setPrintId(i.id)}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" />Print
                </Button>
              </div>
            ))}
          </div>
        </div>
        <BillPrintPreview invoiceId={printId} open={!!printId} onClose={() => setPrintId(null)} defaultFormat="thermal80" />
      </div>
    );
  }
  if (kind === "purchase") {
    const cols: ReportColumn<Purchase>[] = [
      { key: "id", header: "Purchase" }, { key: "date", header: "Date", accessor: (p) => new Date(p.date).toLocaleDateString() },
      { key: "dist", header: "Distributor", accessor: (p) => seedDist.find((d) => d.id === p.distributorId)?.name ?? "" },
      { key: "items", header: "Items", accessor: (p) => p.lines.length },
      { key: "total", header: "Total", align: "right", accessor: (p) => Math.round(p.total) },
    ];
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Pharmacy Purchase Report" filename="phm-purchase" columns={cols} rows={seedPur} /></div>;
  }
  if (kind === "content") {
    const grouped: Record<string, { generic: string; drugs: string[]; stock: number }> = {};
    seedDrugs.forEach((d) => {
      const k = d.generic || "-";
      grouped[k] = grouped[k] || { generic: k, drugs: [], stock: 0 };
      grouped[k].drugs.push(d.name); grouped[k].stock += d.stock;
    });
    const rows = Object.values(grouped);
    const cols: ReportColumn<typeof rows[number]>[] = [
      { key: "generic", header: "Content / Generic" }, { key: "drugs", header: "Brands", accessor: (r) => r.drugs.join(", ") }, { key: "stock", header: "Stock", align: "right" },
    ];
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Content-wise Medicine List" filename="phm-content" columns={cols} rows={rows} /></div>;
  }
  if (kind === "stock") {
    const cols: ReportColumn<Drug>[] = [
      { key: "name", header: "Medicine" }, { key: "form", header: "Form" }, { key: "batch", header: "Batch" },
      { key: "expiry", header: "Expiry" }, { key: "stock", header: "Stock", align: "right" },
      { key: "mrp", header: "MRP ₹", align: "right" }, { key: "value", header: "Value ₹", align: "right", accessor: (d) => d.stock * d.mrp },
    ];
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Stock Summary" filename="phm-stock" columns={cols} rows={seedDrugs} /></div>;
  }
  if (kind === "reorder") {
    const cols: ReportColumn<Drug>[] = [
      { key: "name", header: "Medicine" }, { key: "stock", header: "On Hand", align: "right" },
      { key: "reorderLevel", header: "Reorder Level", align: "right" }, { key: "shortfall", header: "Shortfall", align: "right", accessor: (d) => d.reorderLevel - d.stock },
    ];
    return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Reorder Level Report" subtitle="Items at or below reorder level" filename="phm-reorder" columns={cols} rows={belowReorder()} /></div>;
  }
  const cols: ReportColumn<Drug>[] = [
    { key: "name", header: "Medicine" }, { key: "batch", header: "Batch" }, { key: "expiry", header: "Expiry" }, { key: "stock", header: "Stock", align: "right" },
  ];
  return <div className="space-y-3"><KindPicker kind={kind} onChange={setKind} /><ReportView title="Near Expiry (90 days)" filename="phm-expiry" columns={cols} rows={expiringWithin(90)} /></div>;
}

function KindPicker<T extends string>({ kind, onChange }: { kind: T; onChange: (k: T) => void }) {
  const opts = [
    { k: "sales", label: "Sales Report" }, { k: "purchase", label: "Purchase Report" },
    { k: "content", label: "Content-wise List" }, { k: "stock", label: "Stock Summary" },
    { k: "reorder", label: "Reorder Level" }, { k: "expiry", label: "Near Expiry" },
  ];
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-2">
      {opts.map((o) => <button key={o.k} onClick={() => onChange(o.k as T)} className={`rounded-md px-3 py-1.5 text-sm ${kind === o.k ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{o.label}</button>)}
    </div>
  );
}

/* ============================================================
   Import Drugs Dialog (Excel / CSV)
   ============================================================ */
type ParsedDrug = Drug & { _issue?: string };

function ImportDrugsDialog({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (rows: Drug[]) => void }) {
  const [parsed, setParsed] = useState<ParsedDrug[]>([]);
  const [fileName, setFileName] = useState("");

  const templateRows = [
    ["Medicine Name", "Generic", "HSN Code", "Manufacturer", "Rack", "Unit", "Form", "Stock Quantity", "Selling Price", "GST Rate (%)", "Reorder", "Batch No", "Expiry Date"],
    ["Paracetamol 500mg", "Paracetamol", "3004", "Micro Labs", "B2", "Strip", "Tablet", 100, 15, 12, 20, "B1023", "2027-06-30"],
  ];

  const pick = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  };

  const cleanPercent = (value: unknown) => String(value ?? "").replace("%", "").trim();

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Medicines");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "medicines-import-template.xlsx";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const parseFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const out: ParsedDrug[] = rows.map((r, idx) => {
      const name = String(pick(r, ["Medicine Name", "Medicine", "Name", "name"])).trim();
      const mrp = +cleanPercent(pick(r, ["Selling Price", "Selling Price (Incl. GST)", "MRP", "Mrp", "mrp"])) || 0;
      const stock = +cleanPercent(pick(r, ["Stock Quantity", "Stock", "stock"])) || 0;
      const issue = !name ? "Missing name" : !mrp ? "Missing MRP" : undefined;
      return {
        id: `imp-${Date.now()}-${idx}`,
        name,
        generic: String(pick(r, ["Generic", "Generic Name", "generic"])),
        hsn: String(pick(r, ["HSN Code", "HSN", "hsn"]) || "3004"),
        rack: String(pick(r, ["Rack", "RACK", "rack"])),
        manufacturer: String(pick(r, ["Manufacturer", "Mfr", "MFR", "manufacturer"])),
        unit: String(pick(r, ["Unit", "unit"])),
        form: String(pick(r, ["Form", "Category", "Dosage Form", "form"]) || "Tablet"),
        stock,
        mrp,
        gst: +cleanPercent(pick(r, ["GST Rate (%)", "GST", "GST%", "gst"])) || 12,
        reorderLevel: +cleanPercent(pick(r, ["Reorder", "Reorder Level", "reorder"])) || 0,
        batch: String(pick(r, ["Batch No", "Batch", "batch"])),
        expiry: String(pick(r, ["Expiry Date", "Expiry", "expiry"])),
        _issue: issue,
      };
    });
    setParsed(out);
  };

  const validCount = parsed.filter((r) => !r._issue).length;
  const doImport = () => {
    const rows: Drug[] = parsed.filter((r) => !r._issue).map(({ _issue, ...d }) => { void _issue; return d; });
    if (!rows.length) { toast.error("No valid rows to import"); return; }
    onImport(rows);
    setParsed([]); setFileName("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setParsed([]); setFileName(""); } }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-4 w-4" />Import Medicines from Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />Download template
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
              <Upload className="h-4 w-4" /> Choose .xlsx / .csv
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); e.currentTarget.value = ""; }} />
            </label>
            {fileName && <div className="text-xs text-muted-foreground">Loaded: <span className="font-mono">{fileName}</span></div>}
          </div>

          <div className="rounded-md border p-2 text-[11px] text-muted-foreground">
            Expected columns: <span className="font-mono">Medicine Name, Generic, HSN Code, Manufacturer, Rack, Unit, Stock Quantity, Selling Price, GST Rate (%), Batch No, Expiry Date</span>. Simple columns like Name, MRP, Stock also work.
          </div>

          {parsed.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <div>{parsed.length} rows parsed · <span className="text-emerald-700">{validCount} valid</span> · <span className="text-rose-600">{parsed.length - validCount} with issues</span></div>
              </div>
              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 text-left">
                    <tr>
                      <th className="px-2 py-1.5">Name</th><th className="px-2 py-1.5">Generic</th><th className="px-2 py-1.5">Form</th>
                      <th className="px-2 py-1.5 text-right">Stock</th><th className="px-2 py-1.5 text-right">MRP</th>
                      <th className="px-2 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((r, i) => (
                      <tr key={i} className={`border-t ${r._issue ? "bg-rose-500/5" : ""}`}>
                        <td className="px-2 py-1">{r.name || "-"}</td>
                        <td className="px-2 py-1">{r.generic}</td>
                        <td className="px-2 py-1">{r.form}</td>
                        <td className="px-2 py-1 text-right font-mono">{r.stock}</td>
                        <td className="px-2 py-1 text-right font-mono">{r.mrp}</td>
                        <td className="px-2 py-1">
                          {r._issue ? <span className="text-rose-600">{r._issue}</span> : <span className="text-emerald-700">OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={doImport} disabled={validCount === 0} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="mr-2 h-4 w-4" />Import {validCount} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
