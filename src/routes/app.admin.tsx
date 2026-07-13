import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Printer,
  TrendingUp,
  IndianRupee,
  AlertCircle,
  FileCheck2,
  ChevronDown,
  ChevronRight,
  Undo2,
  FileCode2,
  FileSpreadsheet,
  BookOpen,
  LayoutDashboard,
  User,
  Shield,
  Bell,
  Check,
  Percent,
  ClipboardCheck,
  CalendarRange,
  Eye,
  X,
  Cloud,
  Users as UsersIcon,
  KeyRound,
  Trash2,
  Copy,
  Building2,
  Plus,
  Pencil,
  Sparkles,
  Settings2,
  Save,
  FlaskConical,
  TrendingDown,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  invoices as seedInvoices,
  findPatient,
  invoiceTotal,
  revenueSeries,
  auditLog,
  audit,
  notifications as seedNotifications,
  persistNow,
  gstSummary,
  reconcile,
  daybook,
  procedures as seedProcedures,
  notify,
  type Invoice,
  type AuditEntry,
  type Notification,
  type Procedure,
  testCatalog,
  type LabTest,
  labPackages,
  type LabPackage,
  pendingTestEdits,
  type PendingTestEdit,
  accountsSnapshots,
  type AccountsSnapshot,
  labVendors,
  reagents,
  testBoms,
  labIndents,
  labPOs,
  labGRNs,
  apEntries,
  nextBomId,
  type LabVendor,
  type LabIndent,
  insurancePlans,
  insuranceClaims,
  addInsurancePlan,
  updateInsurancePlan,
  removeInsurancePlan,
  updateInsuranceClaim,
  findInsurancePlan,
  type InsurancePlan,
  type InsuranceClaim,
} from "@/lib/mock/data";
import { resetFrontOffice, frontOfficeTodayStats, resetLab, labTodayStats, resetPharmacy, pharmacyTodayStats, arAging, apAging, doctorPayouts, performDayClose, isDayClosed, dayCloses,
  drugs, distributors, procedures,
  pharmacySettings, frontOfficeSettings, hrSettings, salaryComponents, consultTiers,
  updatePharmacySettings, updateFrontOfficeSettings, updateHrSettings,
  upsertSalaryComponent, removeSalaryComponent, upsertConsultTier, removeConsultTier,
  upsertProcedure, removeProcedure, upsertDrug, removeDrug, upsertDistributor, removeDistributor,
} from "@/lib/mock/data";
import { verifyAdmin } from "@/lib/roles";
import { UserPlus, Ticket, Stethoscope, Wallet, RefreshCw, AlertTriangle } from "lucide-react";
import {
  downloadTallyXml,
  downloadTallyXlsx,
  downloadTallyCsv,
  type TallyVoucherType,
} from "@/lib/tally/export";
import { PatientHistory } from "@/components/patient-history";
import { BackupPanel } from "@/components/backup-panel";
import { canWriteAdmin, getRole, ROLE_LABEL } from "@/lib/roles";
import {
  dailySnapshot,
  financialKPIs,
  patientAnalytics,
  genderSplit,
  ageBuckets,
  revenueSplit,
  collectionsByMode,
} from "@/lib/mock/kpis";
import {
  staff,
  credentials,
  passwordResetRequests,
  addStaff,
  removeStaff,
  updateStaff,
  resetPassword,
  toggleDisabled,
  resolvePasswordReset,
  type StaffMember,
} from "@/lib/mock/hr";
import {
  departments,
  addDepartment,
  updateDepartment,
  removeDepartment,
  findDepartment,
  type Department,
} from "@/lib/mock/departments";
import type { Role, NotificationAudience } from "@/lib/mock/data";

type AdminTab =
  | "dashboard"
  | "daybook"
  | "receivables"
  | "payables"
  | "payouts"
  | "insurance"
  | "patient360"
  | "gst"
  | "reconcile"
  | "approvals"
  | "staff"
  | "departments"
  | "access"
  | "backup"
  | "audit"
  | "settings";

export const Route = createFileRoute("/app/admin")({
  validateSearch: (s: Record<string, unknown>): { tab: AdminTab } => ({
    tab: (s.tab as AdminTab) || "dashboard",
  }),
  component: Admin,
});

function Admin() {
  const nav = useNavigate();
  const { tab } = Route.useSearch();
  const role = typeof window !== "undefined" ? getRole() : null;
  const canWrite = canWriteAdmin();
  // Accountant lands on Daybook and cannot see admin-only tabs.
  const ACCOUNTANT_TABS = new Set<AdminTab>(["daybook", "receivables", "payables", "payouts", "insurance", "patient360", "gst", "reconcile", "audit"]);
  useEffect(() => {
    if (role === "accountant" && !ACCOUNTANT_TABS.has(tab)) {
      nav({ to: "/app/admin", search: { tab: "daybook" }, replace: true });
    }
  }, [role, tab, nav]);
  const [invoices, setInvoices] = useState<Invoice[]>(seedInvoices);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    let revenue = 0,
      outstanding = 0;
    invoices.forEach((i) => {
      const { total } = invoiceTotal(i);
      if (i.paid) revenue += total;
      else outstanding += total;
    });
    return {
      revenue,
      outstanding,
      count: invoices.length,
      unpaid: invoices.filter((i) => !i.paid).length,
    };
  }, [invoices]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const bulkApprove = () => {
    const ids = [...selected];
    if (!ids.length) return;
    const prev = invoices;
    setInvoices((xs) =>
      xs.map((i) =>
        ids.includes(i.id)
          ? {
              ...i,
              paid: true,
              audit: [
                ...i.audit,
                { at: new Date().toISOString(), by: "admin", note: "Marked paid (bulk)" },
              ],
            }
          : i,
      ),
    );
    setSelected(new Set());
    audit("admin", "bulk_mark_paid", { entity: "invoice", meta: { ids } });
    toast.success(`${ids.length} invoices marked paid`, {
      action: { label: "Undo", onClick: () => setInvoices(prev) },
    });
  };

  const exportCsv = () => {
    const rows = [["Invoice", "Patient", "Date", "Subtotal", "Discount", "Total", "Paid"]];
    invoices.forEach((i) => {
      const p = findPatient(i.patientId);
      const t = invoiceTotal(i);
      rows.push([
        i.id,
        p?.name ?? "",
        i.date,
        `${t.subtotal}`,
        `${t.discount}`,
        `${t.total}`,
        i.paid ? "Yes" : "No",
      ]);
    });
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shifa-invoices-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {!canWrite && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <Eye className="h-3.5 w-3.5" />
          Signed in as <b>{role ? ROLE_LABEL[role] : "Guest"}</b>. Read-only access to all modules;
          write actions (approvals, bulk mark-paid) are restricted to Administrator.
        </div>
      )}
      <AdminPageTitle tab={tab} />
      <div className="w-full">
        {tab === "dashboard" && (
          <div className="mt-4 space-y-4">
            <DashboardBento />
            <FrontOfficeMirrorTiles />
            <LabMirrorTiles />
            <PharmacyMirrorTiles />




            {/* Bento KPI row */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KPI
                icon={IndianRupee}
                label="Revenue (7d)"
                value={`₹${stats.revenue.toLocaleString("en-IN")}`}
                tint="text-revenue"
              />
              <KPI
                icon={AlertCircle}
                label="Outstanding"
                value={`₹${stats.outstanding.toLocaleString("en-IN")}`}
                tint="text-outstanding"
              />
              <KPI
                icon={FileCheck2}
                label="Invoices"
                value={String(stats.count)}
                tint="text-primary"
              />
              <KPI
                icon={TrendingUp}
                label="Unpaid"
                value={String(stats.unpaid)}
                tint="text-status-waiting"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border bg-card p-4 lg:col-span-2">
                <div className="mb-2 text-sm font-semibold">Revenue vs Outstanding</div>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={revenueSeries}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="day" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--revenue)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="outstanding"
                        stroke="var(--outstanding)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-2 text-sm font-semibold">Daily Collection</div>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={revenueSeries}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="day" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="revenue" fill="var(--revenue)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <TallyExport invoices={invoices} />

            <div className="rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="text-sm font-semibold">Invoices</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  {canWrite && (
                    <>
                      <Button size="sm" disabled={selected.size === 0} onClick={bulkApprove}>
                        <FileCheck2 className="mr-2 h-4 w-4" />
                        Mark {selected.size || ""} Paid
                      </Button>
                      {selected.size > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                          <Undo2 className="mr-2 h-4 w-4" />
                          Clear
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="divide-y">
                {invoices.map((i) => {
                  const p = findPatient(i.patientId);
                  const t = invoiceTotal(i);
                  const isOpen = expanded.has(i.id);
                  return (
                    <div key={i.id}>
                      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3">
                        {canWrite ? (
                          <Checkbox
                            checked={selected.has(i.id)}
                            onCheckedChange={() => toggle(i.id)}
                          />
                        ) : (
                          <span />
                        )}
                        <button
                          onClick={() => toggleExpand(i.id)}
                          className="flex min-w-0 items-center gap-2 text-left"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {i.id} <span className="text-muted-foreground">· {p?.name}</span>
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              Subtotal ₹{t.subtotal} · Discount ₹{t.discount} ·{" "}
                              <b>Total ₹{t.total}</b>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {i.paid ? (
                            <Badge className="bg-status-checkedin/15 text-status-checkedin border-status-checkedin/40">
                              Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-status-waiting/15 text-status-waiting border-status-waiting/40">
                              Unpaid
                            </Badge>
                          )}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="ghost">
                                Audit
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 text-xs">
                              <div className="mb-1 font-semibold">Audit trail</div>
                              {i.audit.map((a, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between border-b py-1 last:border-b-0"
                                >
                                  <span>{a.note}</span>
                                  <span className="text-muted-foreground">
                                    {new Date(a.at).toLocaleTimeString()} · {a.by}
                                  </span>
                                </div>
                              ))}
                            </PopoverContent>
                          </Popover>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => nav({ to: "/print/bill/$id", params: { id: i.id }, search: { format: "a5", embed: false } })}
                          >
                            <Printer className="mr-1 h-3.5 w-3.5" />
                            Print
                          </Button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="border-t bg-muted/30 px-6 py-3">
                          <table className="w-full text-xs">
                            <thead className="text-muted-foreground">
                              <tr>
                                <th className="text-left">Description</th>
                                <th className="text-right">Qty</th>
                                <th className="text-right">Rate</th>
                                <th className="text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {i.lines.map((l, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="py-1">{l.desc}</td>
                                  <td className="py-1 text-right font-mono">{l.qty}</td>
                                  <td className="py-1 text-right font-mono">₹{l.rate}</td>
                                  <td className="py-1 text-right font-mono">₹{l.qty * l.rate}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "daybook" && (
          <div className="mt-4">
            <DaybookView />
          </div>
        )}

        {tab === "receivables" && (
          <div className="mt-4">
            <ReceivablesView />
          </div>
        )}

        {tab === "payables" && (
          <div className="mt-4">
            <PayablesView />
          </div>
        )}

        {tab === "payouts" && (
          <div className="mt-4">
            <DoctorPayoutsView />
          </div>
        )}

        {tab === "insurance" && (
          <div className="mt-4">
            <InsuranceView />
          </div>
        )}


        {tab === "patient360" && (
          <div className="mt-4">
            <PatientHistory />
          </div>
        )}

        {canWrite && tab === "approvals" && (
          <div className="mt-4">
            <ApprovalsView />
          </div>
        )}

        {canWrite && tab === "staff" && (
          <div className="mt-4">
            <StaffView />
          </div>
        )}

        {canWrite && tab === "departments" && (
          <div className="mt-4">
            <DepartmentsView />
          </div>
        )}

        {canWrite && tab === "access" && (
          <div className="mt-4">
            <AccessControlView />
          </div>
        )}

        {tab === "gst" && (
          <div className="mt-4">
            <GstView />
          </div>
        )}

        {tab === "reconcile" && (
          <div className="mt-4">
            <ReconcileView />
          </div>
        )}

        {tab === "audit" && (
          <div className="mt-4">
            <AuditLogView />
          </div>
        )}

        {canWrite && tab === "backup" && (
          <div className="mt-4 space-y-4">
            <BackupPanel />
            <FrontOfficeResetPanel />
            <LabResetPanel />
            <PharmacyResetPanel />
          </div>

        )}


        {tab === "settings" && (
          <div className="mt-4">
            <SettingsHub canWrite={canWrite} />
          </div>
        )}
      </div>
    </div>
  );
}

function AuditLogView() {
  const [q, setQ] = useState("");
  const [module, setModule] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [, setTick] = useState(0);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return [...auditLog].reverse().filter((e) => {
      if (module !== "all" && e.module !== module) return false;
      if (action !== "all" && e.action !== action) return false;
      if (!ql) return true;
      return (
        e.actor.toLowerCase().includes(ql) ||
        (e.entity ?? "").toLowerCase().includes(ql) ||
        (e.entityId ?? "").toLowerCase().includes(ql) ||
        JSON.stringify(e.meta ?? "")
          .toLowerCase()
          .includes(ql)
      );
    });
  }, [q, module, action, auditLog.length]);

  const modules = Array.from(new Set(auditLog.map((e) => e.module)));
  const actions = Array.from(new Set(auditLog.map((e) => e.action)));

  const exportCsv = () => {
    const header = [
      "Timestamp",
      "Actor",
      "Role",
      "Module",
      "Action",
      "Entity",
      "Entity ID",
      "Detail",
    ];
    const lines = [
      header,
      ...rows.map((r: AuditEntry) => [
        r.ts,
        r.actor,
        r.role,
        r.module,
        r.action,
        r.entity ?? "",
        r.entityId ?? "",
        JSON.stringify(r.meta ?? ""),
      ]),
    ];
    const csv = lines
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    audit("admin", "export", { entity: "audit_log", meta: { rows: rows.length } });
    setTick((n) => n + 1);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_10rem_10rem_auto]">
          <Input
            placeholder="Search actor, entity, detail…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9"
          />
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Module</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                  No audit entries.
                </td>
              </tr>
            ) : (
              rows.slice(0, 500).map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {new Date(r.ts).toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="font-medium">{r.actor}</span>{" "}
                    <span className="text-[10px] text-muted-foreground">({r.role})</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge variant="outline">{r.module}</Badge>
                  </td>
                  <td className="px-3 py-1.5 text-xs font-mono">{r.action}</td>
                  <td className="px-3 py-1.5 text-xs">
                    {r.entity}
                    {r.entityId ? (
                      <span className="ml-1 font-mono text-muted-foreground">#{r.entityId}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {r.meta ? JSON.stringify(r.meta) : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {rows.length > 500 && (
          <div className="border-t p-2 text-center text-[11px] text-muted-foreground">
            Showing latest 500 of {rows.length} entries
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${tint}`} />
      </div>
      <div className={`mt-1 text-2xl font-bold ${tint}`}>{value}</div>
    </div>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TallyExport({ invoices }: { invoices: Invoice[] }) {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [vtype, setVtype] = useState<TallyVoucherType>("Sales");

  const filtered = useMemo(() => {
    const f = new Date(from + "T00:00:00").getTime();
    const t = new Date(to + "T23:59:59").getTime();
    return invoices.filter((i) => {
      if (i.department !== "pharmacy") return false;
      const ts = new Date(i.date).getTime();
      if (ts < f || ts > t) return false;
      return true;
    });
  }, [invoices, from, to]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (a, i) => {
        const t = invoiceTotal(i);
        return { taxable: a.taxable + t.taxable, gst: a.gst + t.gst, total: a.total + t.total };
      },
      { taxable: 0, gst: 0, total: 0 },
    );
  }, [filtered]);

  const run = (kind: "xml" | "xlsx" | "csv") => {
    if (filtered.length === 0) {
      toast.error("No pharmacy invoices in range");
      return;
    }
    const name = `tally-pharmacy-${vtype.toLowerCase().replace(/\s+/g, "-")}-${from}_to_${to}`;
    if (kind === "xml") downloadTallyXml(filtered, vtype, name);
    else if (kind === "xlsx") downloadTallyXlsx(filtered, name);
    else downloadTallyCsv(filtered, name);
    audit("admin", "tally_export", {
      entity: "invoice_batch",
      meta: { format: kind, vtype, from, to, count: filtered.length },
    });
    toast.success(`Exported ${filtered.length} vouchers`);
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">Tally Export · Pharmacy</div>
            <div className="text-xs text-muted-foreground">
              GST-ready vouchers for Tally.ERP 9 / Prime
            </div>
          </div>
        </div>
        <Badge variant="outline" className="font-mono">
          {filtered.length} vouchers · ₹{totals.total.toFixed(2)}
        </Badge>
      </div>
      <div className="grid gap-3 p-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        <div>
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Voucher type</Label>
          <select
            value={vtype}
            onChange={(e) => setVtype(e.target.value as TallyVoucherType)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="Sales">Sales</option>
            <option value="Credit Note">Credit Note (Sales Return)</option>
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button size="sm" onClick={() => run("xml")}>
            <FileCode2 className="mr-2 h-4 w-4" />
            Tally XML
          </Button>
          <Button size="sm" variant="outline" onClick={() => run("xlsx")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => run("csv")}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>
      <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Taxable ₹{totals.taxable.toFixed(2)} · GST ₹{totals.gst.toFixed(2)} · Total ₹
        {totals.total.toFixed(2)} · Ledgers: Sales - Pharmacy, Output CGST, Output SGST
      </div>
    </div>
  );
}

/* ================= Admin page title ================= */
const TAB_META: Record<
  string,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  dashboard: {
    label: "Dashboard",
    description: "Operational overview of the clinic",
    icon: LayoutDashboard,
  },
  daybook: {
    label: "Daybook",
    description: "Department-wise collections & patient counts",
    icon: CalendarRange,
  },
  receivables: { label: "Receivables", description: "Unpaid invoices grouped by patient & age", icon: TrendingUp },
  insurance: { label: "Insurance & TPA", description: "Claims tracking, TPA plans, and settlement", icon: Shield },
  payables: { label: "Payables", description: "Distributor dues from Lab & Pharmacy GRNs", icon: TrendingDown },
  payouts: { label: "Doctor Payouts", description: "Consultation share, TDS and net payable per doctor", icon: Stethoscope },
  patient360: { label: "Patient 360", description: "Full patient timeline", icon: User },
  gst: { label: "GST Reports", description: "GSTR-1 & GSTR-3B summaries", icon: Percent },
  reconcile: {
    label: "Reconciliation",
    description: "Bill ↔ patient integrity check",
    icon: ClipboardCheck,
  },
  approvals: {
    label: "Approvals",
    description: "Pending proposals awaiting your action",
    icon: Check,
  },
  staff: { label: "Staff", description: "People and roles", icon: UsersIcon },
  departments: {
    label: "Departments",
    description: "Manage clinical & operational departments",
    icon: Building2,
  },
  access: {
    label: "Access Control",
    description: "Passwords, roles, disabled accounts",
    icon: KeyRound,
  },
  backup: { label: "Backup", description: "Snapshots & restore", icon: Cloud },
  audit: { label: "Audit Log", description: "Full activity trail", icon: Shield },
  settings: { label: "Settings", description: "Module masters - Lab prices, and more", icon: Settings2 },
};

function AdminPageTitle({ tab }: { tab: string }) {
  const meta = TAB_META[tab] ?? TAB_META.dashboard;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-lg font-bold leading-tight">{meta.label}</h1>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </div>
    </div>
  );
}

/* ================= Departments ================= */
function DepartmentsView() {
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [head, setHead] = useState<string>("");
  const [active, setActive] = useState(true);

  const reset = () => {
    setEditing(null);
    setName("");
    setCode("");
    setDescription("");
    setHead("");
    setActive(true);
  };

  const startEdit = (d: Department) => {
    setEditing(d);
    setName(d.name);
    setCode(d.code);
    setDescription(d.description ?? "");
    setHead(d.head ?? "");
    setActive(d.active);
  };

  const save = () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code required");
      return;
    }
    if (editing) {
      updateDepartment(editing.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        head: head || undefined,
        active,
      });
      toast.success(`${name} updated`);
    } else {
      const d = addDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        head: head || undefined,
        active,
      });
      toast.success(`${d.name} created`);
      notify(
        "system",
        `Department ${d.name} added`,
        { departmentId: d.id },
        { audience: ["all"], title: "New department" },
      );
    }
    reset();
    bump();
  };

  const remove = (d: Department) => {
    if (!confirm(`Remove department "${d.name}"? Staff assignments will be cleared.`)) return;
    removeDepartment(d.id);
    // clear staff assignments to this dept
    staff.forEach((s) => {
      if (s.departmentId === d.id) updateStaff(s.id, { departmentId: undefined });
    });
    toast.success("Removed");
    bump();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <div className="rounded-xl border bg-card">
        <div className="border-b p-3 text-sm font-semibold">
          {editing ? `Edit · ${editing.name}` : "Add department"}
        </div>
        <div className="space-y-3 p-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Radiology"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RAD"
              />
            </div>
            <div>
              <Label className="text-xs">Head of dept</Label>
              <select
                value={head}
                onChange={(e) => setHead(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">- none -</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{" "}
            Active
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}>
              {editing ? "Save changes" : "Add department"}
            </Button>
            {editing && (
              <Button size="sm" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-semibold">All departments · {departments.length}</div>
          <Badge variant="outline">{departments.filter((d) => d.active).length} active</Badge>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Head</th>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => {
              const headName = d.head ? staff.find((s) => s.id === d.head)?.name : null;
              const count = staff.filter((s) => s.departmentId === d.id).length;
              return (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {d.name}
                    <div className="text-[11px] text-muted-foreground">{d.description || "-"}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{d.code}</td>
                  <td className="px-3 py-2 text-xs">
                    {headName ?? <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{count}</td>
                  <td className="px-3 py-2 text-xs">
                    {d.active ? (
                      <span className="text-emerald-600">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove(d)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {departments.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                  No departments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= GST Reports ================= */
function GstView() {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const summary = useMemo(() => gstSummary(from, to), [from, to]);

  const exportCsv = () => {
    const header = ["HSN", "Invoices", "Taxable", "CGST", "SGST", "Total"];
    const rows = [
      header,
      ...summary.rows.map((r) => [
        r.hsn,
        String(r.count),
        r.taxable.toFixed(2),
        r.cgst.toFixed(2),
        r.sgst.toFixed(2),
        r.total.toFixed(2),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `gstr1-summary-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    audit("admin", "gst_export", {
      entity: "gst_summary",
      meta: { from, to, rows: summary.rows.length },
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-semibold">GST Reports · Pharmacy</div>
              <div className="text-xs text-muted-foreground">
                GSTR-1 (outward supplies by HSN) & GSTR-3B summary. Consultation & lab are
                GST-exempt.
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>
        <div className="grid gap-3 p-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-3 text-sm font-semibold">GSTR-1 · Outward Supplies by HSN</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">HSN</th>
              <th className="px-3 py-2 text-right">Invoices</th>
              <th className="px-3 py-2 text-right">Taxable ₹</th>
              <th className="px-3 py-2 text-right">CGST ₹</th>
              <th className="px-3 py-2 text-right">SGST ₹</th>
              <th className="px-3 py-2 text-right">Total ₹</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                  No taxable pharmacy invoices in range.
                </td>
              </tr>
            ) : (
              summary.rows.map((r) => (
                <tr key={r.hsn} className="border-t">
                  <td className="px-3 py-2 font-mono">{r.hsn}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.count}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.taxable.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.cgst.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.sgst.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.total.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-3 text-sm font-semibold">GSTR-3B · Summary</div>
        <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-4">
          <SummaryCell label="Taxable turnover" value={summary.totals.taxable} />
          <SummaryCell label="CGST" value={summary.totals.cgst} />
          <SummaryCell label="SGST" value={summary.totals.sgst} />
          <SummaryCell label="Total tax" value={summary.totals.gst} />
          <SummaryCell label="Total (with GST)" value={summary.totals.total} />
          <SummaryCell label="Exempt (consult/lab)" value={summary.totals.exempt} />
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-bold">
        ₹ {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

/* ================= Reconciliation ================= */
function ReconcileView() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return reconcile().filter(
      (r) =>
        !s ||
        r.mrn.toLowerCase().includes(s) ||
        r.name.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s),
    );
  }, [q]);
  const missing = rows.filter((r) => !r.ok).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <ClipboardCheck className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Bill ↔ Patient Reconciliation</div>
        <Badge variant="outline">{rows.length} bills</Badge>
        {missing > 0 && (
          <Badge className="bg-destructive/15 text-destructive border-destructive/40">
            {missing} missing patient
          </Badge>
        )}
        <Input
          placeholder="Filter by MRN, name or bill…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="ml-auto h-9 w-64"
        />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Bill</th>
              <th className="px-3 py-2">Dept</th>
              <th className="px-3 py-2">MRN</th>
              <th className="px-3 py-2">Patient</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Check</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t ${!r.ok ? "bg-destructive/5" : ""}`}>
                <td className="px-3 py-1.5 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-1.5 text-xs">
                  <Badge variant="outline">{r.department}</Badge>
                </td>
                <td className="px-3 py-1.5 font-mono text-xs">{r.mrn}</td>
                <td className="px-3 py-1.5">{r.name}</td>
                <td className="px-3 py-1.5 text-xs">
                  {r.paid ? (
                    <span className="text-status-checkedin">Paid</span>
                  ) : (
                    <span className="text-status-waiting">Unpaid</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right font-mono">
                  ₹{r.total.toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-1.5 text-xs">
                  {r.ok ? (
                    <span className="text-status-checkedin">✓ OK</span>
                  ) : (
                    <span className="text-destructive">Missing MRN</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApprovalsBadge() {
  const pending = seedNotifications.filter(
    (n) => n.type === "procedure_proposal" && !n.meta?.__resolved,
  ).length;
  if (!pending) return null;
  return (
    <Badge className="ml-1 h-4 min-w-4 rounded-full bg-primary px-1 text-[10px]">{pending}</Badge>
  );
}

function ApprovalsView() {
  const [, setTick] = useState(0);
  const bump = () => {
    persistNow();
    setTick((t) => t + 1);
  };
  const pending = seedNotifications.filter(
    (n) => n.type === "procedure_proposal" && !n.meta?.__resolved,
  );

  const approve = (n: Notification) => {
    const d = n.meta as { code: string; name: string; rate: number };
    if (seedProcedures.some((p) => p.code === d.code)) {
      toast.error("Code already exists");
      return;
    }
    const p: Procedure = { id: `pr${Date.now()}`, code: d.code, name: d.name, rate: d.rate };
    seedProcedures.unshift(p);
    n.meta = { ...(n.meta || {}), __resolved: "approved" };
    audit("admin", "procedure_approve", { entity: "procedure", meta: { ...p } });
    toast.success(`Approved ${p.name}`);
    bump();
  };
  const reject = (n: Notification) => {
    n.meta = { ...(n.meta || {}), __resolved: "rejected" };
    audit("admin", "procedure_reject", { entity: "procedure", meta: { ...(n.meta || {}) } });
    toast.message("Proposal rejected");
    bump();
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-3 text-sm font-semibold">Pending Approvals · Procedure Master</div>
      {pending.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">No pending proposals.</div>
      ) : (
        <div className="divide-y">
          {pending.map((n) => {
            const d = n.meta as { code: string; name: string; rate: number };
            return (
              <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <div className="text-sm font-medium">
                    {d.name} <span className="text-muted-foreground">· {d.code}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Suggested ₹{d.rate} · {new Date(n.ts).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => reject(n)}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => approve(n)}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Approve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DaybookView() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const db = useMemo(() => daybook(from, to), [from, to]);

  const role = typeof window !== "undefined" ? getRole() : null;
  const [closedTick, setClosedTick] = useState(0);
  const alreadyClosed = isDayClosed(today);
  const lastClose = dayCloses[0];

  const doDayClose = () => {
    if (alreadyClosed) { toast.info("Today is already closed"); return; }
    const dc = performDayClose(role ?? "accountant");
    setClosedTick((n) => n + 1);
    toast.success(`Day closed · ₹${dc.collected.toLocaleString("en-IN")} collected · cash ₹${dc.cashInHand.toLocaleString("en-IN")}`);
  };
  void closedTick;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
        <div>
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lastClose && (
            <Badge variant="outline" className="text-[10px]">
              Last closed {new Date(lastClose.closedAt).toLocaleString("en-IN")} by {lastClose.closedBy}
            </Badge>
          )}
          <Button
            size="sm"
            variant={alreadyClosed ? "outline" : "default"}
            onClick={doDayClose}
            disabled={alreadyClosed}
            className={alreadyClosed ? "" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
          >
            <Lock className="mr-1 h-4 w-4" />
            {alreadyClosed ? "Today closed" : "Close today"}
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {db.rows.map((r) => (
          <div key={r.key} className="rounded-xl border bg-card p-3">
            <div className="text-[11px] uppercase text-muted-foreground">{r.label}</div>
            <div className="mt-1 font-mono text-lg">₹{r.collected.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">
              Outstanding ₹{r.outstanding.toLocaleString()} · {r.count} bills
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-primary/10 p-3 md:col-span-1">
          <div className="text-[11px] uppercase text-muted-foreground">Total Collected</div>
          <div className="mt-1 font-mono text-2xl">₹{db.totals.collected.toLocaleString()}</div>
          <div className="text-[11px] text-muted-foreground">
            Outstanding ₹{db.totals.outstanding.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Consulting Patients</div>
          <div className="mt-1 font-mono text-2xl">{db.patients.consulting}</div>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Lab Walk-in</div>
          <div className="mt-1 font-mono text-2xl">{db.patients.lab_walkin}</div>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Pharmacy Walk-in</div>
          <div className="mt-1 font-mono text-2xl">{db.patients.pharma_walkin}</div>
        </div>
      </div>
    </div>
  );
}

/* ============ Dashboard Bento (Snapshot / KPIs / Analytics + Charts) ============ */

const PIE_COLORS = ["#0ea5e9", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

function DashboardBento() {
  const snap = useMemo(() => dailySnapshot(), []);
  const kpi = useMemo(() => financialKPIs(), []);
  const pa = useMemo(() => patientAnalytics(), []);
  const gender = useMemo(() => genderSplit(), []);
  const ages = useMemo(() => ageBuckets(), []);
  const rev = useMemo(() => revenueSplit(), []);
  const mode = useMemo(() => collectionsByMode(), []);
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <StatList
          title="Daily Snapshot"
          items={[
            ["Total Patients", String(snap.totalPatients)],
            ["New Patients", String(snap.newPatients)],
            ["Repeat Patients", String(snap.repeatPatients)],
            ["Total Revenue", inr(snap.totalRevenue)],
            ["Consultation Revenue", inr(snap.consultRevenue)],
            ["Lab Revenue", inr(snap.labRevenue)],
            ["Pharmacy Revenue", inr(snap.pharmacyRevenue)],
            ["Cash Collection", inr(snap.cashCollection)],
            ["UPI Collection", inr(snap.upiCollection)],
            ["Card Collection", inr(snap.cardCollection)],
            ["Credit Collection", inr(snap.creditCollection)],
          ]}
        />
        <StatList
          title="Financial KPIs"
          items={[
            ["Gross Revenue", inr(kpi.grossRevenue)],
            ["Net Revenue", inr(kpi.netRevenue)],
            ["Today's Profit", inr(kpi.todaysProfit)],
            ["Gross Margin", `${kpi.grossMargin}%`],
            ["Pharmacy Margin", `${kpi.pharmacyMargin}%`],
            ["Lab Margin", `${kpi.labMargin}%`],
            ["Collection Efficiency", `${kpi.collectionEfficiency}%`],
            ["ARPP", inr(kpi.arpp)],
            ["Avg Bill Value", inr(kpi.avgBillValue)],
            ["Revenue Per Doctor", inr(kpi.revenuePerDoctor)],
          ]}
        />
        <StatList
          title="Patient Analytics"
          items={[
            ["OP Visits", String(pa.opVisits)],
            ["Repeat Visit %", `${pa.repeatVisitPct}%`],
            ["New Patient %", `${pa.newPatientPct}%`],
            ["Avg Waiting Time", `${pa.avgWaitingMin} min`],
            ["Follow-up Rate", `${pa.followUpRate}%`],
            ...pa.doctorWise
              .slice(0, 3)
              .map((d) => [`Dr · ${d.name}`, String(d.count)] as [string, string]),
            ...pa.deptWise
              .slice(0, 3)
              .map((d) => [`Dept · ${d.name}`, String(d.count)] as [string, string]),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Patient Gender">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={gender}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
              >
                {gender.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Age Distribution">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={ages}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
              >
                {ages.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue by Department">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={rev}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
              >
                {rev.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[(i + 1) % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Collections by Mode">
          <ResponsiveContainer>
            <BarChart data={mode}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {mode.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function StatList({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <ul className="space-y-1.5 text-sm">
        {items.map(([k, v]) => (
          <li
            key={k}
            className="flex items-baseline justify-between gap-2 border-b border-dashed border-border/60 pb-1 last:border-b-0"
          >
            <span className="text-xs text-muted-foreground">{k}</span>
            <span className="font-mono font-semibold tabular-nums">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="h-56">{children}</div>
    </div>
  );
}

/* ============ Staff Management ============ */

const ROLES: Role[] = ["front_office", "doctor", "lab", "pharmacy", "accountant", "admin"];

function StaffView() {
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("front_office");
  const [mobile, setMobile] = useState("");

  const add = () => {
    if (!name.trim() || !username.trim()) {
      toast.error("Name and username required");
      return;
    }
    const s = addStaff({
      name: name.trim(),
      username,
      role,
      mobile,
      joinedOn: new Date().toISOString().slice(0, 10),
      active: true,
    });
    toast.success(`${s.name} added · temp password ${username}123`);
    setName("");
    setUsername("");
    setMobile("");
    bump();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">Add staff member</div>
        <div className="grid gap-2 md:grid-cols-5">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <Input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input placeholder="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Button onClick={add}>Add</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Mobile</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s: StaffMember) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-1.5 font-medium">{s.name}</td>
                <td className="px-3 py-1.5">
                  <Badge variant="outline">{ROLE_LABEL[s.role]}</Badge>
                </td>
                <td className="px-3 py-1.5 font-mono text-xs">{s.username}</td>
                <td className="px-3 py-1.5 text-xs">{s.mobile || "-"}</td>
                <td className="px-3 py-1.5 text-xs">{s.joinedOn}</td>
                <td className="px-3 py-1.5 text-xs">
                  {s.active ? (
                    <span className="text-emerald-600">Active</span>
                  ) : (
                    <span className="text-muted-foreground">Inactive</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Remove ${s.name}?`)) {
                        removeStaff(s.id);
                        bump();
                        toast.success("Removed");
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ Access Control ============ */

function AccessBadge() {
  const pending = passwordResetRequests.filter((r) => r.status === "pending").length;
  if (!pending) return null;
  return (
    <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
      {pending}
    </span>
  );
}

function AccessControlView() {
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);

  const doReset = (username: string) => {
    const temp = resetPassword(username, "admin");
    navigator.clipboard?.writeText(temp).catch(() => {});
    toast.success(`Temp password: ${temp} (copied)`);
    bump();
  };

  const pending = passwordResetRequests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5">
          <div className="border-b border-amber-500/30 p-3 text-sm font-semibold">
            Pending Password Reset Requests
          </div>
          <ul className="divide-y">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div>
                  <div className="text-sm font-medium">@{r.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.requestedAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const temp = resolvePasswordReset(r.id, "admin");
                    navigator.clipboard?.writeText(temp || "").catch(() => {});
                    toast.success(`Reset · temp password ${temp} (copied)`);
                    bump();
                  }}
                >
                  <KeyRound className="mr-1 h-3.5 w-3.5" />
                  Approve & reset
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-3 text-sm font-semibold">All Users</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last login</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((c) => (
              <tr key={c.username} className="border-t">
                <td className="px-3 py-1.5 font-mono text-xs">{c.username}</td>
                <td className="px-3 py-1.5">
                  <Badge variant="outline">{ROLE_LABEL[c.role]}</Badge>
                </td>
                <td className="px-3 py-1.5 text-xs">
                  {c.disabled ? (
                    <span className="text-rose-600">Disabled</span>
                  ) : c.mustChange ? (
                    <span className="text-amber-600">Must change</span>
                  ) : (
                    <span className="text-emerald-600">Active</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  {c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleString() : "-"}
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  {new Date(c.updatedAt).toLocaleDateString()} · {c.updatedBy}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => doReset(c.username)}>
                      <KeyRound className="mr-1 h-3.5 w-3.5" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        toggleDisabled(c.username, "admin");
                        bump();
                      }}
                    >
                      {c.disabled ? "Enable" : "Disable"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// silence unused imports that are only referenced conditionally
void Copy;

/* ================= Settings Hub (module masters) ================= */
type SettingsModule = "lab" | "lab_purchases" | "accounts" | "pharmacy" | "front_office" | "hr";
function SettingsHub({ canWrite }: { canWrite: boolean }) {
  const [module, setModule] = useState<SettingsModule>("lab");
  const modules: { key: SettingsModule; label: string; description: string; icon: React.ComponentType<{ className?: string }>; ready: boolean }[] = [
    { key: "lab", label: "Laboratory", description: "Tests, prices, pending proposals", icon: FlaskConical, ready: true },
    { key: "lab_purchases", label: "Lab Purchases", description: "Vendors, BOM, indent approvals", icon: FlaskConical, ready: true },
    { key: "accounts", label: "Accounts", description: "Revenue snapshots, accounts payable", icon: BookOpen, ready: true },
    { key: "pharmacy", label: "Pharmacy", description: "Drug master, distributors, GST, feature flags", icon: Pencil, ready: true },
    { key: "front_office", label: "Front Office", description: "Procedure fees, consult tiers, discount policy", icon: Pencil, ready: true },
    { key: "hr", label: "HR & Payroll", description: "Departments, salary components, leave policy", icon: Pencil, ready: true },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
      <aside className="space-y-2">
        {modules.map((m) => {
          const active = module === m.key;
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => setModule(m.key)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{m.label}</div>
                <div className="truncate text-xs text-muted-foreground">{m.description}</div>
                {!m.ready && <div className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">Coming soon</div>}
              </div>
            </button>
          );
        })}
      </aside>
      <section className="space-y-4">
        {module === "lab" && (
          <>
            <PendingTestEditsPanel canWrite={canWrite} />
            <LabPricesEditor canWrite={canWrite} />
            <LabPackagesEditor canWrite={canWrite} />
          </>
        )}
        {module === "lab_purchases" && (
          <>
            <IndentApprovalsPanel canWrite={canWrite} />
            <LabVendorsPanel canWrite={canWrite} />
            <LabBomPanel canWrite={canWrite} />
          </>
        )}
        {module === "accounts" && (
          <>
            <AccountsPayablePanel canWrite={canWrite} />
            <AccountsSnapshotsPanel />
          </>
        )}
        {module === "pharmacy" && <PharmacySettingsPanel canWrite={canWrite} />}
        {module === "front_office" && <FrontOfficeSettingsPanel canWrite={canWrite} />}
        {module === "hr" && <HrSettingsPanel canWrite={canWrite} />}
      </section>
    </div>
  );
}

function PendingTestEditsPanel({ canWrite }: { canWrite: boolean }) {
  const [, forceTick] = useState(0);
  const refresh = () => forceTick((n) => n + 1);
  const rows = pendingTestEdits;
  const apply = (e: PendingTestEdit) => {
    if (!canWrite) { toast.error("Read-only account"); return; }
    if (e.kind === "create") {
      if (testCatalog.some((t) => t.code === e.code)) { toast.error(`Code ${e.code} already exists`); return; }
      testCatalog.unshift({ code: e.code, name: e.name, unit: e.unit, low: e.low, high: e.high, price: e.price });
    } else if (e.kind === "update") {
      const idx = testCatalog.findIndex((t) => t.code === (e.targetCode ?? e.code));
      if (idx < 0) { toast.error("Target test not found"); return; }
      testCatalog[idx] = { ...testCatalog[idx], name: e.name, unit: e.unit, low: e.low, high: e.high, price: e.price };
    } else if (e.kind === "delete") {
      const idx = testCatalog.findIndex((t) => t.code === (e.targetCode ?? e.code));
      if (idx < 0) { toast.error("Target test not found"); return; }
      testCatalog.splice(idx, 1);
    }
    const i = pendingTestEdits.findIndex((x) => x.id === e.id);
    if (i >= 0) pendingTestEdits.splice(i, 1);
    audit("admin", "lab_test_approve", { entity: "test", entityId: e.code, meta: { kind: e.kind } });
    toast.success(`${e.kind} approved`); refresh();
  };
  const reject = (e: PendingTestEdit) => {
    if (!canWrite) { toast.error("Read-only account"); return; }
    const i = pendingTestEdits.findIndex((x) => x.id === e.id);
    if (i >= 0) pendingTestEdits.splice(i, 1);
    audit("admin", "lab_test_reject", { entity: "test", entityId: e.code, meta: { kind: e.kind } });
    toast.success("Rejected"); refresh();
  };
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Pending Test Proposals</div>
          <div className="text-xs text-muted-foreground">{rows.length} awaiting review · from Lab → Packages → Test Proposals</div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">No pending proposals</div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-2">Kind</th><th className="px-2 py-2">Code</th><th className="px-2 py-2">Name</th><th className="px-2 py-2 text-right">Price ₹</th><th className="px-2 py-2">Requested</th><th className="px-2 py-2 text-right w-40">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-2 py-1"><Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40">{e.kind}</Badge></td>
                  <td className="px-2 py-1 font-mono text-xs">{e.code}</td>
                  <td className="px-2 py-1">{e.name}{e.note ? <span className="ml-2 text-[11px] text-muted-foreground">· {e.note}</span> : null}</td>
                  <td className="px-2 py-1 text-right font-mono">₹{e.price}</td>
                  <td className="px-2 py-1 text-xs text-muted-foreground">{e.requestedBy} · {new Date(e.requestedAt).toLocaleDateString()}</td>
                  <td className="px-2 py-1 text-right">
                    {canWrite && <Button size="sm" variant="ghost" className="text-emerald-700" onClick={() => apply(e)}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>}
                    {canWrite && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => reject(e)}><X className="h-3.5 w-3.5" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AccountsSnapshotsPanel() {
  const [view, setView] = useState<AccountsSnapshot | null>(null);
  const rows = accountsSnapshots;
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <div className="text-sm font-semibold">Accounts Snapshots</div>
        <div className="text-xs text-muted-foreground">Revenue reports synced by module teams (currently: Lab).</div>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">No snapshots yet. Lab → Analytics → Sync to Accounts.</div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-2">ID</th><th className="px-2 py-2">Scope</th><th className="px-2 py-2">Range</th><th className="px-2 py-2 text-right">Bills</th><th className="px-2 py-2 text-right">Net ₹</th><th className="px-2 py-2">Sent</th><th className="px-2 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-2 py-1 font-mono text-xs">{s.id}</td>
                  <td className="px-2 py-1"><Badge variant="outline">{s.scope}</Badge></td>
                  <td className="px-2 py-1 text-xs">{s.from} → {s.to}</td>
                  <td className="px-2 py-1 text-right">{s.totals.count}</td>
                  <td className="px-2 py-1 text-right font-mono">₹{s.totals.net.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-1 text-xs text-muted-foreground">{s.createdBy} · {new Date(s.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-2 py-1 text-right"><Button size="sm" variant="ghost" onClick={() => setView(s)}><Eye className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">{view.id} · {view.from} → {view.to}</div>
            <Button size="sm" variant="ghost" onClick={() => setView(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="overflow-auto rounded border bg-background">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left uppercase text-muted-foreground">
                <tr><th className="px-2 py-1">Invoice</th><th className="px-2 py-1">Date</th><th className="px-2 py-1">Patient</th><th className="px-2 py-1">Type</th><th className="px-2 py-1 text-right">Items</th><th className="px-2 py-1 text-right">Gross</th><th className="px-2 py-1 text-right">Disc</th><th className="px-2 py-1 text-right">Net</th></tr>
              </thead>
              <tbody>
                {view.rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-2 py-1 font-mono">{r.id}</td>
                    <td className="px-2 py-1">{new Date(r.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-2 py-1">{r.patient}</td>
                    <td className="px-2 py-1">{r.type}</td>
                    <td className="px-2 py-1 text-right">{r.items}</td>
                    <td className="px-2 py-1 text-right font-mono">₹{r.gross}</td>
                    <td className="px-2 py-1 text-right font-mono">₹{r.discount}</td>
                    <td className="px-2 py-1 text-right font-mono">₹{r.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LabPricesEditor({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<LabTest[]>([...testCatalog]);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(ql) || r.code.toLowerCase().includes(ql));
  }, [rows, q]);

  const update = (idx: number, patch: Partial<LabTest>) => {
    setRows((xs) => xs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const del = (idx: number) => {
    if (!canWrite) return;
    setRows((xs) => xs.filter((_, i) => i !== idx));
  };
  const add = () => {
    if (!canWrite) return;
    setRows((xs) => [{ code: `NEW${xs.length + 1}`, name: "New Test", unit: "", low: 0, high: 99999, price: 0 }, ...xs]);
  };
  const persist = () => {
    if (!canWrite) { toast.error("Read-only account"); return; }
    // Validate unique codes
    const codes = new Set<string>();
    for (const r of rows) {
      if (!r.code.trim() || !r.name.trim()) { toast.error("Code and name required"); return; }
      if (codes.has(r.code)) { toast.error(`Duplicate code: ${r.code}`); return; }
      codes.add(r.code);
    }
    testCatalog.splice(0, testCatalog.length, ...rows);
    audit("admin", "lab_price_update", { entity: "lab_test", meta: { count: rows.length } });
    toast.success("Lab prices saved");
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Lab Test Prices</div>
          <div className="text-xs text-muted-foreground">These prices power the Laboratory billing screen.</div>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 w-56" />
          {canWrite && <Button size="sm" variant="outline" onClick={add}><Plus className="mr-1 h-4 w-4" />Add</Button>}
          {canWrite && <Button size="sm" onClick={persist}><Save className="mr-1 h-4 w-4" />Save</Button>}
        </div>
      </div>
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2 w-24">Code</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2 w-24">Unit</th>
              <th className="px-2 py-2 w-24 text-right">Low</th>
              <th className="px-2 py-2 w-24 text-right">High</th>
              <th className="px-2 py-2 w-28 text-right">Price ₹</th>
              <th className="px-2 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const idx = rows.indexOf(r);
              return (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1"><Input value={r.code} disabled={!canWrite} onChange={(e) => update(idx, { code: e.target.value.toUpperCase() })} className="h-8 font-mono text-xs" /></td>
                  <td className="px-2 py-1"><Input value={r.name} disabled={!canWrite} onChange={(e) => update(idx, { name: e.target.value })} className="h-8" /></td>
                  <td className="px-2 py-1"><Input value={r.unit} disabled={!canWrite} onChange={(e) => update(idx, { unit: e.target.value })} className="h-8" /></td>
                  <td className="px-2 py-1"><Input value={r.low} disabled={!canWrite} onChange={(e) => update(idx, { low: Number(e.target.value) || 0 })} className="h-8 text-right font-mono" /></td>
                  <td className="px-2 py-1"><Input value={r.high} disabled={!canWrite} onChange={(e) => update(idx, { high: Number(e.target.value) || 0 })} className="h-8 text-right font-mono" /></td>
                  <td className="px-2 py-1"><Input value={r.price ?? 0} disabled={!canWrite} onChange={(e) => update(idx, { price: Number(e.target.value) || 0 })} className="h-8 text-right font-mono" /></td>
                  <td className="px-2 py-1 text-right">
                    {canWrite && (
                      <Button size="sm" variant="ghost" onClick={() => del(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">No tests match "{q}"</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {!canWrite && (
        <div className="text-[11px] text-muted-foreground">Read-only mode - sign in as Administrator to edit prices.</div>
      )}
    </div>
  );
}

function LabPackagesEditor({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<LabPackage[]>([...labPackages]);
  const commit = (next: LabPackage[]) => {
    setRows(next);
    labPackages.splice(0, labPackages.length, ...next);
  };
  const approve = (id: string) => {
    if (!canWrite) return;
    commit(rows.map((p) => (p.id === id ? { ...p, status: "active" } : p)));
    audit("admin", "lab_package_approve", { entity: "lab_package", entityId: id });
    toast.success("Package approved");
  };
  const del = (id: string) => {
    if (!canWrite) return;
    commit(rows.filter((p) => p.id !== id));
    audit("admin", "lab_package_delete", { entity: "lab_package", entityId: id });
    toast.success("Deleted");
  };
  const pending = rows.filter((r) => (r.status ?? "active") === "pending").length;
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Lab Packages</div>
          <div className="text-xs text-muted-foreground">
            {pending > 0 ? `${pending} awaiting approval` : "No pending packages"} · lab users request, admin approves.
          </div>
        </div>
      </div>
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2 w-24">Code</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Tests</th>
              <th className="px-2 py-2 w-24">Status</th>
              <th className="px-2 py-2 w-24 text-right">Price ₹</th>
              <th className="px-2 py-2 w-40 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const status = p.status ?? "active";
              return (
                <tr key={p.id} className="border-t">
                  <td className="px-2 py-1 font-mono text-xs">{p.code}</td>
                  <td className="px-2 py-1 font-medium">{p.name}</td>
                  <td className="px-2 py-1 text-xs">{p.testCodes.join(", ")}</td>
                  <td className="px-2 py-1">
                    {status === "active"
                      ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40">Active</Badge>
                      : <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40">Pending</Badge>}
                  </td>
                  <td className="px-2 py-1 text-right font-mono">{p.price}</td>
                  <td className="px-2 py-1 text-right">
                    {canWrite && status === "pending" && (
                      <Button size="sm" variant="ghost" className="text-emerald-700" onClick={() => approve(p.id)}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>
                    )}
                    {canWrite && <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-muted-foreground">No packages yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {!canWrite && (
        <div className="text-[11px] text-muted-foreground">Read-only mode - sign in as Administrator to approve or delete packages.</div>
      )}
    </div>
  );
}

/* ================= Lab Vendors ================= */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
function LabVendorsPanel({ canWrite }: { canWrite: boolean }) {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const [edit, setEdit] = useState<LabVendor | "new" | null>(null);
  const seed: LabVendor = { id: `lv${Date.now()}`, name: "", gstin: "", phone: "", email: "", address: "", active: true };
  const [f, setF] = useState<LabVendor>(seed);
  const open = (v: LabVendor | "new") => { setF(v === "new" ? { ...seed, id: `lv${Date.now()}` } : { ...v }); setEdit(v); };
  const save = () => {
    if (!f.name.trim()) { toast.error("Name required"); return; }
    if (!GSTIN_RE.test(f.gstin)) { toast.error("Invalid GSTIN format"); return; }
    if (edit === "new") labVendors.unshift(f);
    else { const i = labVendors.findIndex((x) => x.id === f.id); if (i >= 0) labVendors[i] = f; }
    persistNow(); audit("admin", edit === "new" ? "lab_vendor_create" : "lab_vendor_edit", { entity: "lab_vendor", entityId: f.id });
    toast.success("Vendor saved"); setEdit(null); refresh();
  };
  const del = (id: string) => {
    if (!confirm("Remove vendor?")) return;
    const i = labVendors.findIndex((x) => x.id === id); if (i >= 0) labVendors.splice(i, 1);
    persistNow(); audit("admin", "lab_vendor_delete", { entity: "lab_vendor", entityId: id });
    refresh();
  };
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Lab Vendors</div>
          <div className="text-xs text-muted-foreground">Pre-approved reagent suppliers · GSTIN required</div>
        </div>
        {canWrite && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => open("new")}><Plus className="mr-1 h-3.5 w-3.5" />New Vendor</Button>}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-2 py-2">Name</th><th className="px-2 py-2">GSTIN</th><th className="px-2 py-2">Contact</th><th className="px-2 py-2">Status</th><th className="px-2 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {labVendors.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">No vendors yet</td></tr>
            ) : labVendors.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-2 py-1 font-medium">{v.name}</td>
                <td className="px-2 py-1 font-mono text-xs">{v.gstin}</td>
                <td className="px-2 py-1 text-xs">{v.phone ?? "-"}{v.email ? ` · ${v.email}` : ""}</td>
                <td className="px-2 py-1">{v.active ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
                <td className="px-2 py-1 text-right">
                  {canWrite && <Button size="sm" variant="ghost" onClick={() => open(v)}>Edit</Button>}
                  {canWrite && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!edit} onOpenChange={(v) => { if (!v) setEdit(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit === "new" ? "New Vendor" : "Edit Vendor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-9" /></div>
            <div className="col-span-2"><Label>GSTIN</Label><Input value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} className="h-9 font-mono" placeholder="e.g. 32ABCDE1234F1Z5" /></div>
            <div><Label>Phone</Label><Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} className="h-9" /></div>
            <div><Label>Email</Label><Input value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} className="h-9" /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} className="h-9" /></div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox checked={f.active} onCheckedChange={(v) => setF({ ...f, active: !!v })} id="v-active" />
              <label htmlFor="v-active" className="text-sm">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={save}><Save className="mr-2 h-4 w-4" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= Lab BOM Editor ================= */
function LabBomPanel({ canWrite }: { canWrite: boolean }) {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const [testCode, setTestCode] = useState("");
  const [reagentId, setReagentId] = useState(reagents[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const add = () => {
    if (!canWrite) return;
    const tc = testCode.trim().toUpperCase();
    if (!testCatalog.some((t) => t.code === tc)) { toast.error("Unknown test code"); return; }
    const q = +qty || 0; if (q <= 0) { toast.error("Qty must be > 0"); return; }
    testBoms.unshift({ id: nextBomId(), testCode: tc, reagentId, qtyPerTest: q });
    persistNow(); audit("admin", "bom_add", { entity: "test_bom", entityId: tc, meta: { reagentId, qty: q } });
    setTestCode(""); setQty("1"); refresh();
  };
  const del = (id: string) => {
    if (!canWrite) return;
    const i = testBoms.findIndex((b) => b.id === id); if (i >= 0) testBoms.splice(i, 1);
    persistNow(); refresh();
  };
  const grouped = useMemo(() => {
    const m: Record<string, typeof testBoms> = {};
    for (const b of testBoms) (m[b.testCode] ||= []).push(b);
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b));
  }, [testBoms.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <div className="text-sm font-semibold">Test → Reagent BOM</div>
        <div className="text-xs text-muted-foreground">Recipe used to auto-deduct reagent stock when a test is finalized. Multiple tests can share the same reagent (e.g. FBS, PPBS, RBS → Glucose).</div>
      </div>
      {canWrite && (
        <div className="grid grid-cols-[8rem_1fr_5rem_auto] gap-2">
          <Input placeholder="Test code" value={testCode} onChange={(e) => setTestCode(e.target.value.toUpperCase())} className="h-9 font-mono" />
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={reagentId} onChange={(e) => setReagentId(e.target.value)}>
            {reagents.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <Input value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 font-mono text-right" />
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={add}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>
      )}
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-2 py-2">Test</th><th className="px-2 py-2">Reagent</th><th className="px-2 py-2 text-right">Qty/test</th><th className="px-2 py-2"></th></tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">No BOM entries</td></tr>
            ) : grouped.flatMap(([code, rows]) => rows.map((b, i) => {
              const t = testCatalog.find((x) => x.code === code);
              const r = reagents.find((x) => x.id === b.reagentId);
              return (
                <tr key={b.id} className="border-t">
                  <td className="px-2 py-1"><span className="font-mono text-xs text-emerald-700">{code}</span> {i === 0 ? <span className="ml-1 text-xs text-muted-foreground">{t?.name}</span> : ""}</td>
                  <td className="px-2 py-1">{r?.name ?? b.reagentId}</td>
                  <td className="px-2 py-1 text-right font-mono">{b.qtyPerTest}</td>
                  <td className="px-2 py-1 text-right">{canWrite && <Button size="sm" variant="ghost" onClick={() => del(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= Indent Approvals (mirror of lab-side view) ================= */
function IndentApprovalsPanel({ canWrite }: { canWrite: boolean }) {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const pending = labIndents.filter((i) => i.status === "submitted");
  const nav = useNavigate();
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Indent Approvals</div>
          <div className="text-xs text-muted-foreground">Approve → creates Purchase Order · reject with reason</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => nav({ to: "/app/lab", search: { tab: "indents" } })}>Open in Lab</Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-2 py-2">ID</th><th className="px-2 py-2">Source</th><th className="px-2 py-2">Items</th><th className="px-2 py-2">Requested</th></tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">No pending indents</td></tr>
            ) : pending.map((ind) => (
              <tr key={ind.id} className="border-t">
                <td className="px-2 py-1 font-mono text-xs text-emerald-700">{ind.id}</td>
                <td className="px-2 py-1 text-xs">{ind.source === "auto_min_max" ? "Auto - low stock" : "Manual"}</td>
                <td className="px-2 py-1 text-xs">
                  {ind.items.map((it) => {
                    const r = reagents.find((x) => x.id === it.reagentId);
                    return <div key={it.reagentId}>{r?.name ?? it.reagentId} × <b>{it.qty}</b></div>;
                  })}
                </td>
                <td className="px-2 py-1 text-xs text-muted-foreground">{ind.createdBy} · {new Date(ind.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!canWrite && <div className="text-[11px] text-muted-foreground">Read-only account - open Lab → Indents as Administrator to approve.</div>}
      {/* Trigger refresh when tab regains focus */}
      <button className="hidden" onClick={refresh} />
    </div>
  );
}

/* ================= Accounts Payable ================= */
function AccountsPayablePanel({ canWrite }: { canWrite: boolean }) {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const [only, setOnly] = useState<"all" | "unpaid" | "paid">("unpaid");
  const rows = useMemo(() => apEntries.filter((e) => only === "all" ? true : only === "paid" ? e.paid : !e.paid), [only, apEntries.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalUnpaid = apEntries.filter((e) => !e.paid).reduce((s, e) => s + e.amount, 0);
  const togglePaid = (id: string) => {
    if (!canWrite) return;
    const e = apEntries.find((x) => x.id === id); if (!e) return;
    e.paid = !e.paid; e.paidAt = e.paid ? new Date().toISOString() : undefined;
    persistNow(); audit("admin", "ap_pay", { entity: "ap_entry", entityId: id, meta: { paid: e.paid } });
    toast.success(e.paid ? "Marked paid" : "Marked unpaid"); refresh();
  };
  const exportCsv = () => {
    const header = ["AP ID", "Vendor", "GRN", "Amount", "GST", "Posted", "Status"].join(",");
    const lines = apEntries.map((e) => {
      const v = labVendors.find((x) => x.id === e.vendorId);
      return [e.id, v?.name ?? "", e.sourceId, e.amount, e.gstAmount, e.postedAt, e.paid ? "PAID" : "UNPAID"].join(",");
    });
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "accounts-payable.csv"; a.click();
  };
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Accounts Payable · Lab Purchases</div>
          <div className="text-xs text-muted-foreground">Auto-posted when a GRN is received. Unpaid balance: <b className="font-mono">₹{totalUnpaid.toLocaleString("en-IN")}</b></div>
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={only} onChange={(e) => setOnly(e.target.value as typeof only)}>
            <option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="all">All</option>
          </select>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-3.5 w-3.5" />CSV</Button>
        </div>
      </div>
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-2 py-2">AP</th><th className="px-2 py-2">Vendor</th><th className="px-2 py-2">GRN</th><th className="px-2 py-2 text-right">Amount</th><th className="px-2 py-2 text-right">GST</th><th className="px-2 py-2">Posted</th><th className="px-2 py-2">Status</th><th className="px-2 py-2 text-right"></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-xs text-muted-foreground">No entries</td></tr>
            ) : rows.map((e) => {
              const v = labVendors.find((x) => x.id === e.vendorId);
              return (
                <tr key={e.id} className="border-t">
                  <td className="px-2 py-1 font-mono text-xs">{e.id}</td>
                  <td className="px-2 py-1">{v?.name ?? "-"}</td>
                  <td className="px-2 py-1 font-mono text-xs">{e.sourceId}</td>
                  <td className="px-2 py-1 text-right font-mono">₹{e.amount.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-1 text-right font-mono">₹{e.gstAmount.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-1 text-xs">{new Date(e.postedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-2 py-1">{e.paid ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40">Paid</Badge> : <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40">Unpaid</Badge>}</td>
                  <td className="px-2 py-1 text-right">
                    {canWrite && <Button size="sm" variant="ghost" onClick={() => togglePaid(e.id)}>{e.paid ? "Mark unpaid" : "Mark paid"}</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Note: Lab purchases attract GST from vendors, but since lab services to patients are GST-exempt, Input Tax Credit (ITC) is not available - GST becomes part of the reagent cost.
      </div>
    </div>
  );
}

// Silence lint on refs used inside effects
void labPOs; void labGRNs;

/* ================ Front Office mirror & reset ================ */
function FrontOfficeMirrorTiles() {
  const s = frontOfficeTodayStats();
  const tiles: { label: string; value: string | number; icon: typeof UserPlus; tint: string }[] = [
    { label: "FO · Today's Registrations", value: s.todayRegs, icon: UserPlus, tint: "text-sky-600" },
    { label: "FO · Today's Visits", value: s.todayVisits, icon: Ticket, tint: "text-emerald-600" },
    { label: "FO · Waiting Now", value: s.waiting, icon: UsersIcon, tint: "text-amber-600" },
    { label: "FO · Today's Collections", value: `₹${s.collections.toLocaleString("en-IN")}`, icon: Wallet, tint: "text-violet-600" },
    { label: "FO · Doctors Present", value: s.doctorsPresent, icon: Stethoscope, tint: "text-indigo-600" },
  ];
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Front Office - live mirror</div>
        <Badge variant="outline" className="text-[10px]">auto-synced</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {tiles.map((t) => {
          const Ico = t.icon;
          return (
            <div key={t.label} className="rounded-lg border bg-muted/20 p-2.5">
              <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider ${t.tint}`}>
                <Ico className="h-3.5 w-3.5" />
                <span className="truncate">{t.label}</span>
              </div>
              <div className="mt-1 font-mono text-xl font-bold">{t.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FrontOfficeResetPanel() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const doReset = () => {
    if (busy) return;
    if (!verifyAdmin(username, password)) {
      toast.error("Wrong administrator credentials");
      return;
    }
    setBusy(true);
    try {
      resetFrontOffice();
      audit("admin", "front_office_reset", { entity: "system", meta: { by: username } });
      toast.success("Front Office data cleared. Reload any Front Office tab to see the empty state.");
      setOpen(false);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4" /> Danger zone · Front Office
      </div>
      <p className="text-xs text-muted-foreground">
        Permanently deletes all patients, visits, appointments, queue entries, front-office invoices,
        cross-consultations, and doctor availability, and resets MRN / visit / token counters.
        Doctors master, Lab, and Pharmacy are untouched.
      </p>
      <Button variant="destructive" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-2 h-4 w-4" /> Reset Front Office data
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm reset · Administrator only</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 h-10" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-10" />
            </div>
            <p className="text-[11px] text-muted-foreground">This action cannot be undone. Take a backup first from the panel above.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doReset} disabled={busy}>
              {busy ? "Wiping…" : "Wipe Front Office data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================ Lab mirror & reset ================ */
function LabMirrorTiles() {
  const s = labTodayStats();
  const tiles: { label: string; value: string | number; icon: typeof FlaskConical; tint: string }[] = [
    { label: "Lab · Today's Orders", value: s.todayOrders, icon: FlaskConical, tint: "text-emerald-600" },
    { label: "Lab · Pending Samples", value: s.pending, icon: ClipboardCheck, tint: "text-amber-600" },
    { label: "Lab · Ready to Dispatch", value: s.ready, icon: FileCheck2, tint: "text-sky-600" },
    { label: "Lab · Today's Collections", value: `₹${s.collections.toLocaleString("en-IN")}`, icon: Wallet, tint: "text-violet-600" },
    { label: "Lab · Reagents Expiring ≤60d", value: s.expiringBatches, icon: AlertTriangle, tint: "text-rose-600" },
  ];
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Lab - live mirror</div>
        <Badge variant="outline" className="text-[10px]">auto-synced</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {tiles.map((t) => {
          const Ico = t.icon;
          return (
            <div key={t.label} className="rounded-lg border bg-muted/20 p-2.5">
              <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider ${t.tint}`}>
                <Ico className="h-3.5 w-3.5" />
                <span className="truncate">{t.label}</span>
              </div>
              <div className="mt-1 font-mono text-xl font-bold">{t.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LabResetPanel() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const doReset = () => {
    if (busy) return;
    if (!verifyAdmin(username, password)) {
      toast.error("Wrong administrator credentials");
      return;
    }
    setBusy(true);
    try {
      resetLab();
      audit("admin", "lab_reset", { entity: "system", meta: { by: username } });
      toast.success("Lab data cleared. Reagent stock reseeded to opening balances.");
      setOpen(false);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4" /> Danger zone · Lab
      </div>
      <p className="text-xs text-muted-foreground">
        Permanently deletes all lab orders, samples, lab invoices, indents, POs, GRNs and AP entries,
        and reseeds reagent batches to opening stock. Reagent master, test catalog, packages and BOMs
        are untouched. Front Office and Pharmacy are untouched.
      </p>
      <Button variant="destructive" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-2 h-4 w-4" /> Reset Lab data
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm reset · Administrator only</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 h-10" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-10" />
            </div>
            <p className="text-[11px] text-muted-foreground">This action cannot be undone. Take a backup first from the panel above.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doReset} disabled={busy}>
              {busy ? "Wiping…" : "Wipe Lab data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================ Pharmacy mirror & reset ================ */
function PharmacyMirrorTiles() {
  const s = pharmacyTodayStats();
  const tiles: { label: string; value: string | number; icon: typeof FlaskConical; tint: string }[] = [
    { label: "Pharmacy · Today's Sales", value: `₹${s.todaySales.toLocaleString("en-IN")}`, icon: Wallet, tint: "text-emerald-600" },
    { label: "Pharmacy · Today's Bills", value: s.rxCount, icon: FileCheck2, tint: "text-sky-600" },
    { label: "Pharmacy · Low Stock", value: s.lowStock, icon: AlertTriangle, tint: "text-amber-600" },
    { label: "Pharmacy · Expiring ≤30d", value: s.expiring30, icon: AlertTriangle, tint: "text-rose-600" },
    { label: "Pharmacy · Total Units", value: s.stockUnits.toLocaleString("en-IN"), icon: ClipboardCheck, tint: "text-violet-600" },
  ];
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Pharmacy - live mirror</div>
        <Badge variant="outline" className="text-[10px]">auto-synced</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {tiles.map((t) => {
          const Ico = t.icon;
          return (
            <div key={t.label} className="rounded-lg border bg-muted/20 p-2.5">
              <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider ${t.tint}`}>
                <Ico className="h-3.5 w-3.5" />
                <span className="truncate">{t.label}</span>
              </div>
              <div className="mt-1 font-mono text-xl font-bold">{t.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PharmacyResetPanel() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const doReset = () => {
    if (busy) return;
    if (!verifyAdmin(username, password)) {
      toast.error("Wrong administrator credentials");
      return;
    }
    setBusy(true);
    try {
      resetPharmacy();
      audit("admin", "pharmacy_reset", { entity: "system", meta: { by: username } });
      toast.success("Pharmacy data cleared. Drug master reseeded to opening stock.");
      setOpen(false);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4" /> Danger zone · Pharmacy
      </div>
      <p className="text-xs text-muted-foreground">
        Permanently deletes all pharmacy invoices, purchases, purchase returns and sales returns,
        and reseeds the drug master + distributors + prescriptions to opening state. Front Office
        and Lab are untouched.
      </p>
      <Button variant="destructive" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-2 h-4 w-4" /> Reset Pharmacy data
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm reset · Administrator only</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 h-10" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-10" />
            </div>
            <p className="text-[11px] text-muted-foreground">This action cannot be undone. Take a backup first from the panel above.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doReset} disabled={busy}>
              {busy ? "Wiping…" : "Wipe Pharmacy data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================ Receivables (AR aging) ================ */
function ReceivablesView() {
  const { rows, totals } = useMemo(() => arAging(), []);
  const cell = (v: number) => (v > 0 ? `₹${v.toLocaleString("en-IN")}` : "-");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <TotalTile label="Total outstanding" value={`₹${totals.total.toLocaleString("en-IN")}`} tint="text-primary" />
        <TotalTile label="0–30 days" value={`₹${totals.d0_30.toLocaleString("en-IN")}`} tint="text-emerald-600" />
        <TotalTile label="31–60 days" value={`₹${totals.d31_60.toLocaleString("en-IN")}`} tint="text-amber-600" />
        <TotalTile label="61–90 days" value={`₹${totals.d61_90.toLocaleString("en-IN")}`} tint="text-orange-600" />
        <TotalTile label="90+ days" value={`₹${totals.d90plus.toLocaleString("en-IN")}`} tint="text-rose-600" />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-left uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Patient</th>
              <th className="px-3 py-2">Dept</th>
              <th className="px-3 py-2 text-right">0–30</th>
              <th className="px-3 py-2 text-right">31–60</th>
              <th className="px-3 py-2 text-right">61–90</th>
              <th className="px-3 py-2 text-right">90+</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Bills</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No outstanding invoices</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2 font-medium">{r.patientName}</td>
                <td className="px-3 py-2 uppercase text-[10px] text-muted-foreground">{r.department}</td>
                <td className="px-3 py-2 text-right font-mono">{cell(r.d0_30)}</td>
                <td className="px-3 py-2 text-right font-mono text-amber-700">{cell(r.d31_60)}</td>
                <td className="px-3 py-2 text-right font-mono text-orange-700">{cell(r.d61_90)}</td>
                <td className="px-3 py-2 text-right font-mono text-rose-700">{cell(r.d90plus)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">₹{r.total.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{r.invoiceIds.length}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-muted/80 font-semibold">
              <tr>
                <td className="px-3 py-2" colSpan={2}>Total</td>
                <td className="px-3 py-2 text-right font-mono">₹{totals.d0_30.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right font-mono">₹{totals.d31_60.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right font-mono">₹{totals.d61_90.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right font-mono">₹{totals.d90plus.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right font-mono">₹{totals.total.toLocaleString("en-IN")}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ================ Payables (AP aging) ================ */
function PayablesView() {
  const { rows, totals } = useMemo(() => apAging(), []);
  const cell = (v: number) => (v > 0 ? `₹${v.toLocaleString("en-IN")}` : "-");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <TotalTile label="Total payable" value={`₹${totals.total.toLocaleString("en-IN")}`} tint="text-primary" />
        <TotalTile label="0–30 days" value={`₹${totals.d0_30.toLocaleString("en-IN")}`} tint="text-emerald-600" />
        <TotalTile label="31–60 days" value={`₹${totals.d31_60.toLocaleString("en-IN")}`} tint="text-amber-600" />
        <TotalTile label="61–90 days" value={`₹${totals.d61_90.toLocaleString("en-IN")}`} tint="text-orange-600" />
        <TotalTile label="90+ days" value={`₹${totals.d90plus.toLocaleString("en-IN")}`} tint="text-rose-600" />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-left uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2 text-right">0–30</th>
              <th className="px-3 py-2 text-right">31–60</th>
              <th className="px-3 py-2 text-right">61–90</th>
              <th className="px-3 py-2 text-right">90+</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Bills</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No unpaid distributor bills</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2 font-medium">{r.vendorName}</td>
                <td className="px-3 py-2 text-right font-mono">{cell(r.d0_30)}</td>
                <td className="px-3 py-2 text-right font-mono text-amber-700">{cell(r.d31_60)}</td>
                <td className="px-3 py-2 text-right font-mono text-orange-700">{cell(r.d61_90)}</td>
                <td className="px-3 py-2 text-right font-mono text-rose-700">{cell(r.d90plus)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">₹{r.total.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{r.entryIds.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================ Doctor Payouts ================ */
function DoctorPayoutsView() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const [from, setFrom] = useState(monthStart.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const rows = useMemo(() => doctorPayouts(from, to), [from, to]);
  const totals = rows.reduce(
    (t, r) => ({
      gross: t.gross + r.gross,
      payout: t.payout + r.payout,
      tds: t.tds + r.tds,
      net: t.net + r.net,
    }),
    { gross: 0, payout: 0, tds: 0, net: 0 },
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </div>
        <div className="ml-auto text-xs text-muted-foreground">TDS applied 10% under 194J (professional fees)</div>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-left uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Doctor</th>
              <th className="px-3 py-2 text-right">Consults</th>
              <th className="px-3 py-2 text-right">Gross</th>
              <th className="px-3 py-2 text-right">Share %</th>
              <th className="px-3 py-2 text-right">Payout</th>
              <th className="px-3 py-2 text-right">TDS</th>
              <th className="px-3 py-2 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No consultations in range</td></tr>
            ) : rows.map((r) => (
              <tr key={r.doctorId} className="border-t">
                <td className="px-3 py-2 font-medium">{r.doctorName}</td>
                <td className="px-3 py-2 text-right">{r.consultCount}</td>
                <td className="px-3 py-2 text-right font-mono">₹{r.gross.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right">{r.sharePct}%</td>
                <td className="px-3 py-2 text-right font-mono">₹{r.payout.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right font-mono text-rose-700">₹{r.tds.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700">₹{r.net.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-muted/80 font-semibold">
              <tr>
                <td className="px-3 py-2" colSpan={2}>Total</td>
                <td className="px-3 py-2 text-right font-mono">₹{totals.gross.toLocaleString("en-IN")}</td>
                <td />
                <td className="px-3 py-2 text-right font-mono">₹{totals.payout.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right font-mono">₹{totals.tds.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right font-mono">₹{totals.net.toLocaleString("en-IN")}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function TotalTile({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className={`text-[10px] font-medium uppercase tracking-wider ${tint}`}>{label}</div>
      <div className="mt-1 font-mono text-lg font-bold">{value}</div>
    </div>
  );
}





/* ================= Pharmacy / Front Office / HR Settings Panels ================= */

function SectionCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ReadOnlyBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return <Badge variant="outline" className="text-[10px]">Read only</Badge>;
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function PharmacySettingsPanel({ canWrite }: { canWrite: boolean }) {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const set = (patch: Partial<typeof pharmacySettings>) => {
    if (!canWrite) { toast.error("Read only account"); return; }
    updatePharmacySettings(patch); refresh(); toast.success("Saved");
  };
  const [drugDlg, setDrugDlg] = useState(false);
  const [drugDraft, setDrugDraft] = useState<{ id?: string; name: string; form: string; hsn: string; mrp: number; gst: number; stock: number; reorderLevel: number; batch: string; expiry: string }>({
    name: "", form: "Tablet", hsn: "3004", mrp: 0, gst: 12, stock: 0, reorderLevel: 10, batch: "", expiry: "",
  });
  const openNewDrug = () => { setDrugDraft({ name: "", form: "Tablet", hsn: "3004", mrp: 0, gst: 12, stock: 0, reorderLevel: 10, batch: "", expiry: "" }); setDrugDlg(true); };
  const openEditDrug = (d: typeof drugs[number]) => {
    setDrugDraft({ id: d.id, name: d.name, form: d.form, hsn: d.hsn ?? "", mrp: d.mrp, gst: d.gst, stock: d.stock, reorderLevel: d.reorderLevel, batch: d.batch, expiry: d.expiry });
    setDrugDlg(true);
  };
  const saveDrug = () => {
    if (!drugDraft.name.trim()) { toast.error("Name required"); return; }
    const d = {
      id: drugDraft.id ?? `drug-${Date.now()}`,
      name: drugDraft.name.trim(), form: drugDraft.form, hsn: drugDraft.hsn || undefined,
      stock: Number(drugDraft.stock) || 0, batch: drugDraft.batch || "-", expiry: drugDraft.expiry || new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
      mrp: Number(drugDraft.mrp) || 0, gst: Number(drugDraft.gst) || 0, reorderLevel: Number(drugDraft.reorderLevel) || 0,
    };
    upsertDrug(d); setDrugDlg(false); refresh(); toast.success("Drug saved");
  };
  const del = (id: string) => {
    if (!canWrite) { toast.error("Read only account"); return; }
    if (!confirm("Delete this drug?")) return;
    removeDrug(id); refresh(); toast.success("Removed");
  };

  const [distDlg, setDistDlg] = useState(false);
  const [distDraft, setDistDraft] = useState<{ id?: string; name: string; gstin: string; contact: string; address: string; openingBalance: number }>({
    name: "", gstin: "", contact: "", address: "", openingBalance: 0,
  });
  const saveDist = () => {
    if (!distDraft.name.trim()) { toast.error("Name required"); return; }
    upsertDistributor({
      id: distDraft.id ?? `dist-${Date.now()}`,
      name: distDraft.name.trim(),
      gstin: distDraft.gstin || undefined,
      contact: distDraft.contact || undefined,
      address: distDraft.address || undefined,
      openingBalance: Number(distDraft.openingBalance) || 0,
    });
    setDistDlg(false); refresh(); toast.success("Distributor saved");
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Feature switches" subtitle="Toggle pharmacy behaviours. Every change is audited." action={<ReadOnlyBadge show={!canWrite} />}>
        <SettingRow label="Schedule H gate" hint="Require prescription reference for Schedule H drugs.">
          <Switch checked={pharmacySettings.scheduleHGate} disabled={!canWrite} onCheckedChange={(v) => set({ scheduleHGate: v })} />
        </SettingRow>
        <SettingRow label="FEFO batch picking" hint="Auto pick nearest expiry batch at POS.">
          <Switch checked={pharmacySettings.fefoPicking} disabled={!canWrite} onCheckedChange={(v) => set({ fefoPicking: v })} />
        </SettingRow>
        <SettingRow label="Require day close" hint="Block logout until pharmacy day close is done.">
          <Switch checked={pharmacySettings.requireDayClose} disabled={!canWrite} onCheckedChange={(v) => set({ requireDayClose: v })} />
        </SettingRow>
        <SettingRow label="Refund cap (₹)" hint="Refunds above this need admin password.">
          <Input type="number" className="w-28" value={pharmacySettings.refundCapINR} disabled={!canWrite} onChange={(e) => set({ refundCapINR: Number(e.target.value) || 0 })} />
        </SettingRow>
        <SettingRow label="Default GST %" hint="Applied when a drug has no GST override.">
          <select className="rounded-md border bg-background px-2 py-1 text-sm" value={pharmacySettings.defaultGst} disabled={!canWrite}
            onChange={(e) => set({ defaultGst: Number(e.target.value) as 0 | 5 | 12 | 18 })}>
            {[0, 5, 12, 18].map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
        </SettingRow>
      </SectionCard>

      <SectionCard title="Drug master" subtitle={`${drugs.length} SKUs. Add, edit, delete.`} action={<Button size="sm" disabled={!canWrite} onClick={openNewDrug}>Add drug</Button>}>
        <div className="max-h-96 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground sticky top-0">
              <tr><th className="px-2 py-2">Name</th><th className="px-2 py-2">Form</th><th className="px-2 py-2">HSN</th><th className="px-2 py-2 text-right">MRP</th><th className="px-2 py-2 text-right">GST</th><th className="px-2 py-2 text-right">Stock</th><th className="px-2 py-2 text-right">Reorder</th><th className="px-2 py-2 text-right w-32">Actions</th></tr>
            </thead>
            <tbody>
              {drugs.slice(0, 50).map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-2 py-1 font-medium">{d.name}</td>
                  <td className="px-2 py-1 text-xs">{d.form}</td>
                  <td className="px-2 py-1 text-xs">{d.hsn ?? "-"}</td>
                  <td className="px-2 py-1 text-right">₹{d.mrp}</td>
                  <td className="px-2 py-1 text-right">{d.gst}%</td>
                  <td className="px-2 py-1 text-right">{d.stock}</td>
                  <td className="px-2 py-1 text-right">{d.reorderLevel}</td>
                  <td className="px-2 py-1 text-right">
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => openEditDrug(d)}>Edit</Button>
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => del(d.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {drugs.length > 50 && <div className="border-t bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">Showing first 50 of {drugs.length}. Use Pharmacy module for full list.</div>}
        </div>
      </SectionCard>

      <SectionCard title="Distributors" subtitle={`${distributors.length} vendors`} action={<Button size="sm" disabled={!canWrite} onClick={() => { setDistDraft({ name: "", gstin: "", contact: "", address: "", openingBalance: 0 }); setDistDlg(true); }}>Add distributor</Button>}>
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-2">Name</th><th className="px-2 py-2">GSTIN</th><th className="px-2 py-2">Contact</th><th className="px-2 py-2 text-right">Opening</th><th className="px-2 py-2 text-right w-32">Actions</th></tr>
            </thead>
            <tbody>
              {distributors.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-2 py-1 font-medium">{d.name}</td>
                  <td className="px-2 py-1 text-xs">{d.gstin ?? "-"}</td>
                  <td className="px-2 py-1 text-xs">{d.contact ?? "-"}</td>
                  <td className="px-2 py-1 text-right">₹{d.openingBalance.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-1 text-right">
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => { setDistDraft({ id: d.id, name: d.name, gstin: d.gstin ?? "", contact: d.contact ?? "", address: d.address ?? "", openingBalance: d.openingBalance }); setDistDlg(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => { if (!confirm("Delete distributor?")) return; removeDistributor(d.id); refresh(); toast.success("Removed"); }}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Dialog open={drugDlg} onOpenChange={setDrugDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{drugDraft.id ? "Edit drug" : "Add drug"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input value={drugDraft.name} onChange={(e) => setDrugDraft({ ...drugDraft, name: e.target.value })} /></div>
            <div><Label>Form</Label><Input value={drugDraft.form} onChange={(e) => setDrugDraft({ ...drugDraft, form: e.target.value })} /></div>
            <div><Label>HSN</Label><Input value={drugDraft.hsn} onChange={(e) => setDrugDraft({ ...drugDraft, hsn: e.target.value })} /></div>
            <div><Label>MRP</Label><Input type="number" value={drugDraft.mrp} onChange={(e) => setDrugDraft({ ...drugDraft, mrp: Number(e.target.value) })} /></div>
            <div><Label>GST %</Label><Input type="number" value={drugDraft.gst} onChange={(e) => setDrugDraft({ ...drugDraft, gst: Number(e.target.value) })} /></div>
            <div><Label>Stock</Label><Input type="number" value={drugDraft.stock} onChange={(e) => setDrugDraft({ ...drugDraft, stock: Number(e.target.value) })} /></div>
            <div><Label>Reorder level</Label><Input type="number" value={drugDraft.reorderLevel} onChange={(e) => setDrugDraft({ ...drugDraft, reorderLevel: Number(e.target.value) })} /></div>
            <div><Label>Batch</Label><Input value={drugDraft.batch} onChange={(e) => setDrugDraft({ ...drugDraft, batch: e.target.value })} /></div>
            <div><Label>Expiry</Label><Input type="date" value={drugDraft.expiry} onChange={(e) => setDrugDraft({ ...drugDraft, expiry: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setDrugDlg(false)}>Cancel</Button><Button onClick={saveDrug}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={distDlg} onOpenChange={setDistDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{distDraft.id ? "Edit distributor" : "Add distributor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input value={distDraft.name} onChange={(e) => setDistDraft({ ...distDraft, name: e.target.value })} /></div>
            <div><Label>GSTIN</Label><Input value={distDraft.gstin} onChange={(e) => setDistDraft({ ...distDraft, gstin: e.target.value })} /></div>
            <div><Label>Contact</Label><Input value={distDraft.contact} onChange={(e) => setDistDraft({ ...distDraft, contact: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={distDraft.address} onChange={(e) => setDistDraft({ ...distDraft, address: e.target.value })} /></div>
            <div><Label>Opening balance</Label><Input type="number" value={distDraft.openingBalance} onChange={(e) => setDistDraft({ ...distDraft, openingBalance: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setDistDlg(false)}>Cancel</Button><Button onClick={saveDist}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FrontOfficeSettingsPanel({ canWrite }: { canWrite: boolean }) {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const set = (patch: Partial<typeof frontOfficeSettings>) => {
    if (!canWrite) { toast.error("Read only account"); return; }
    updateFrontOfficeSettings(patch); refresh(); toast.success("Saved");
  };

  const [procDlg, setProcDlg] = useState(false);
  const [procDraft, setProcDraft] = useState<{ id?: string; code: string; name: string; rate: number }>({ code: "", name: "", rate: 0 });
  const saveProc = () => {
    if (!procDraft.code.trim() || !procDraft.name.trim()) { toast.error("Code and name required"); return; }
    upsertProcedure({ id: procDraft.id ?? `pr-${Date.now()}`, code: procDraft.code.trim().toUpperCase(), name: procDraft.name.trim(), rate: Number(procDraft.rate) || 0 });
    setProcDlg(false); refresh(); toast.success("Procedure saved");
  };

  const [tierDlg, setTierDlg] = useState(false);
  const [tierDraft, setTierDraft] = useState<{ doctor: string; newVisit: number; followUp: number; teleconsult: number; original?: string }>({ doctor: "", newVisit: 0, followUp: 0, teleconsult: 0 });
  const saveTier = () => {
    if (!tierDraft.doctor.trim()) { toast.error("Doctor name required"); return; }
    if (tierDraft.original && tierDraft.original !== tierDraft.doctor) removeConsultTier(tierDraft.original);
    upsertConsultTier({ doctor: tierDraft.doctor.trim(), newVisit: Number(tierDraft.newVisit) || 0, followUp: Number(tierDraft.followUp) || 0, teleconsult: Number(tierDraft.teleconsult) || 0 });
    setTierDlg(false); refresh(); toast.success("Tier saved");
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Feature switches" subtitle="Registration and billing behaviours." action={<ReadOnlyBadge show={!canWrite} />}>
        <SettingRow label="Require phone OTP on registration" hint="Verify mobile via OTP before creating a new MRN.">
          <Switch checked={frontOfficeSettings.requirePhoneOtp} disabled={!canWrite} onCheckedChange={(v) => set({ requirePhoneOtp: v })} />
        </SettingRow>
        <SettingRow label="Strict duplicate MRN check" hint="Block registration when name plus phone already exists.">
          <Switch checked={frontOfficeSettings.strictDuplicateMrn} disabled={!canWrite} onCheckedChange={(v) => set({ strictDuplicateMrn: v })} />
        </SettingRow>
        <SettingRow label="Allow walk in without appointment" hint="Off forces every visit through the appointment calendar.">
          <Switch checked={frontOfficeSettings.allowWalkIn} disabled={!canWrite} onCheckedChange={(v) => set({ allowWalkIn: v })} />
        </SettingRow>
        <SettingRow label="Discount without approval (%)" hint="Reception can apply up to this percent without a password.">
          <Input type="number" className="w-24" value={frontOfficeSettings.discountNoApprovalPct} disabled={!canWrite} onChange={(e) => set({ discountNoApprovalPct: Number(e.target.value) || 0 })} />
        </SettingRow>
        <SettingRow label="Reason required above (%)" hint="Discounts above this need a written reason on the bill.">
          <Input type="number" className="w-24" value={frontOfficeSettings.discountReasonThresholdPct} disabled={!canWrite} onChange={(e) => set({ discountReasonThresholdPct: Number(e.target.value) || 0 })} />
        </SettingRow>
        <SettingRow label="Token prefix">
          <Input className="w-24" value={frontOfficeSettings.tokenPrefix} disabled={!canWrite} onChange={(e) => set({ tokenPrefix: e.target.value.toUpperCase() })} />
        </SettingRow>
        <SettingRow label="OP slip prefix">
          <Input className="w-24" value={frontOfficeSettings.opSlipPrefix} disabled={!canWrite} onChange={(e) => set({ opSlipPrefix: e.target.value.toUpperCase() })} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Procedure fees" subtitle={`${procedures.length} procedures`} action={<Button size="sm" disabled={!canWrite} onClick={() => { setProcDraft({ code: "", name: "", rate: 0 }); setProcDlg(true); }}>Add procedure</Button>}>
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-2">Code</th><th className="px-2 py-2">Name</th><th className="px-2 py-2 text-right">Rate</th><th className="px-2 py-2 text-right w-32">Actions</th></tr>
            </thead>
            <tbody>
              {procedures.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-2 py-1 font-mono text-xs">{p.code}</td>
                  <td className="px-2 py-1">{p.name}</td>
                  <td className="px-2 py-1 text-right">₹{p.rate}</td>
                  <td className="px-2 py-1 text-right">
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => { setProcDraft({ id: p.id, code: p.code, name: p.name, rate: p.rate }); setProcDlg(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => { if (!confirm("Delete procedure?")) return; removeProcedure(p.id); refresh(); toast.success("Removed"); }}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Consultation tiers" subtitle="Per doctor fees for new visit, follow up, teleconsult." action={<Button size="sm" disabled={!canWrite} onClick={() => { setTierDraft({ doctor: "", newVisit: 0, followUp: 0, teleconsult: 0 }); setTierDlg(true); }}>Add tier</Button>}>
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-2">Doctor</th><th className="px-2 py-2 text-right">New visit</th><th className="px-2 py-2 text-right">Follow up</th><th className="px-2 py-2 text-right">Teleconsult</th><th className="px-2 py-2 text-right w-32">Actions</th></tr>
            </thead>
            <tbody>
              {consultTiers.map((t) => (
                <tr key={t.doctor} className="border-t">
                  <td className="px-2 py-1 font-medium">{t.doctor}</td>
                  <td className="px-2 py-1 text-right">₹{t.newVisit}</td>
                  <td className="px-2 py-1 text-right">₹{t.followUp}</td>
                  <td className="px-2 py-1 text-right">₹{t.teleconsult}</td>
                  <td className="px-2 py-1 text-right">
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => { setTierDraft({ doctor: t.doctor, original: t.doctor, newVisit: t.newVisit, followUp: t.followUp, teleconsult: t.teleconsult }); setTierDlg(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => { if (!confirm("Delete tier?")) return; removeConsultTier(t.doctor); refresh(); toast.success("Removed"); }}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Dialog open={procDlg} onOpenChange={setProcDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{procDraft.id ? "Edit procedure" : "Add procedure"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code</Label><Input value={procDraft.code} onChange={(e) => setProcDraft({ ...procDraft, code: e.target.value })} /></div>
            <div><Label>Rate</Label><Input type="number" value={procDraft.rate} onChange={(e) => setProcDraft({ ...procDraft, rate: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Name</Label><Input value={procDraft.name} onChange={(e) => setProcDraft({ ...procDraft, name: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setProcDlg(false)}>Cancel</Button><Button onClick={saveProc}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tierDlg} onOpenChange={setTierDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tierDraft.original ? "Edit tier" : "Add tier"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Doctor</Label><Input value={tierDraft.doctor} onChange={(e) => setTierDraft({ ...tierDraft, doctor: e.target.value })} /></div>
            <div><Label>New visit</Label><Input type="number" value={tierDraft.newVisit} onChange={(e) => setTierDraft({ ...tierDraft, newVisit: Number(e.target.value) })} /></div>
            <div><Label>Follow up</Label><Input type="number" value={tierDraft.followUp} onChange={(e) => setTierDraft({ ...tierDraft, followUp: Number(e.target.value) })} /></div>
            <div><Label>Teleconsult</Label><Input type="number" value={tierDraft.teleconsult} onChange={(e) => setTierDraft({ ...tierDraft, teleconsult: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setTierDlg(false)}>Cancel</Button><Button onClick={saveTier}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HrSettingsPanel({ canWrite }: { canWrite: boolean }) {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const set = (patch: Partial<typeof hrSettings>) => {
    if (!canWrite) { toast.error("Read only account"); return; }
    updateHrSettings(patch); refresh(); toast.success("Saved");
  };

  const [scDlg, setScDlg] = useState(false);
  const [scDraft, setScDraft] = useState<{ id?: string; label: string; kind: "earning" | "deduction"; defaultPct: number }>({ label: "", kind: "earning", defaultPct: 0 });
  const saveSc = () => {
    if (!scDraft.label.trim()) { toast.error("Label required"); return; }
    upsertSalaryComponent({ id: scDraft.id ?? `sc-${Date.now()}`, label: scDraft.label.trim(), kind: scDraft.kind, defaultPct: Number(scDraft.defaultPct) || 0 });
    setScDlg(false); refresh(); toast.success("Component saved");
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Leave policy" subtitle="Yearly quotas and carry forward rules." action={<ReadOnlyBadge show={!canWrite} />}>
        <SettingRow label="Casual leave (CL) per year"><Input type="number" className="w-24" value={hrSettings.leaveCL} disabled={!canWrite} onChange={(e) => set({ leaveCL: Number(e.target.value) || 0 })} /></SettingRow>
        <SettingRow label="Sick leave (SL) per year"><Input type="number" className="w-24" value={hrSettings.leaveSL} disabled={!canWrite} onChange={(e) => set({ leaveSL: Number(e.target.value) || 0 })} /></SettingRow>
        <SettingRow label="Earned leave (EL) per year"><Input type="number" className="w-24" value={hrSettings.leaveEL} disabled={!canWrite} onChange={(e) => set({ leaveEL: Number(e.target.value) || 0 })} /></SettingRow>
        <SettingRow label="Carry forward cap (days)"><Input type="number" className="w-24" value={hrSettings.carryForwardCap} disabled={!canWrite} onChange={(e) => set({ carryForwardCap: Number(e.target.value) || 0 })} /></SettingRow>
      </SectionCard>

      <SectionCard title="Attendance rules" subtitle="Grace, half day, overtime.">
        <SettingRow label="Grace period (minutes)"><Input type="number" className="w-24" value={hrSettings.attendanceGraceMin} disabled={!canWrite} onChange={(e) => set({ attendanceGraceMin: Number(e.target.value) || 0 })} /></SettingRow>
        <SettingRow label="Half day cutoff (minutes late)"><Input type="number" className="w-24" value={hrSettings.halfDayCutoffMin} disabled={!canWrite} onChange={(e) => set({ halfDayCutoffMin: Number(e.target.value) || 0 })} /></SettingRow>
        <SettingRow label="Overtime multiplier"><Input type="number" step="0.1" className="w-24" value={hrSettings.overtimeMultiplier} disabled={!canWrite} onChange={(e) => set({ overtimeMultiplier: Number(e.target.value) || 1 })} /></SettingRow>
      </SectionCard>

      <SectionCard title="Salary components" subtitle={`${salaryComponents.length} components. Basic and HRA, plus statutory deductions.`}
        action={<Button size="sm" disabled={!canWrite} onClick={() => { setScDraft({ label: "", kind: "earning", defaultPct: 0 }); setScDlg(true); }}>Add component</Button>}>
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-2">Component</th><th className="px-2 py-2">Type</th><th className="px-2 py-2 text-right">Default %</th><th className="px-2 py-2 text-right w-32">Actions</th></tr>
            </thead>
            <tbody>
              {salaryComponents.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-2 py-1 font-medium">{c.label}</td>
                  <td className="px-2 py-1 text-xs"><Badge variant="outline" className={c.kind === "earning" ? "border-emerald-500/40 text-emerald-700" : "border-rose-500/40 text-rose-700"}>{c.kind}</Badge></td>
                  <td className="px-2 py-1 text-right">{c.defaultPct}%</td>
                  <td className="px-2 py-1 text-right">
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => { setScDraft({ id: c.id, label: c.label, kind: c.kind, defaultPct: c.defaultPct }); setScDlg(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => { if (!confirm("Delete component?")) return; removeSalaryComponent(c.id); refresh(); toast.success("Removed"); }}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Departments" subtitle={`${departments.length} departments. Manage full list in Admin, Departments tab.`}>
        <div className="flex flex-wrap gap-2">
          {departments.map((d) => (
            <Badge key={d.id} variant="outline" className="text-xs">{d.name} <span className="ml-1 text-muted-foreground">({d.code})</span></Badge>
          ))}
        </div>
      </SectionCard>

      <Dialog open={scDlg} onOpenChange={setScDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{scDraft.id ? "Edit component" : "Add component"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Label</Label><Input value={scDraft.label} onChange={(e) => setScDraft({ ...scDraft, label: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <select className="w-full rounded-md border bg-background px-2 py-1 text-sm" value={scDraft.kind} onChange={(e) => setScDraft({ ...scDraft, kind: e.target.value as "earning" | "deduction" })}>
                <option value="earning">Earning</option>
                <option value="deduction">Deduction</option>
              </select>
            </div>
            <div><Label>Default %</Label><Input type="number" value={scDraft.defaultPct} onChange={(e) => setScDraft({ ...scDraft, defaultPct: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setScDlg(false)}>Cancel</Button><Button onClick={saveSc}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ======================================================================
   Insurance & TPA Claims Management View
   ====================================================================== */
function InsuranceView() {
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);

  // States for Claims tab
  const [claimSearch, setClaimSearch] = useState("");
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>("all");
  
  // States for Plans tab
  const [showPlanDlg, setShowPlanDlg] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InsurancePlan | null>(null);
  const [providerName, setProviderName] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [tpaName, setTpaName] = useState("");
  const [coveragePercent, setCoveragePercent] = useState(80);
  const [maxCover, setMaxCover] = useState(500000);
  const [planStatus, setPlanStatus] = useState<"active" | "expired" | "suspended">("active");

  // Actions for Settle dialog
  const [showSettleDlg, setShowSettleDlg] = useState<InsuranceClaim | null>(null);
  const [utrRef, setUtrRef] = useState("");
  const [showRejectDlg, setShowRejectDlg] = useState<InsuranceClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const filteredClaims = useMemo(() => {
    const q = claimSearch.toLowerCase().trim();
    return insuranceClaims.filter((c) => {
      const pt = findPatient(c.patientId);
      const plan = findInsurancePlan(c.planId);
      
      const matchesSearch = 
        c.invoiceId.toLowerCase().includes(q) ||
        (pt?.name ?? "").toLowerCase().includes(q) ||
        (pt?.mrn ?? "").toLowerCase().includes(q) ||
        (plan?.providerName ?? "").toLowerCase().includes(q);

      const matchesStatus = claimStatusFilter === "all" || c.status === claimStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [claimSearch, claimStatusFilter, insuranceClaims.length]);

  const stats = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let settledAmount = 0;
    insuranceClaims.forEach((c) => {
      if (c.status === "pending" || c.status === "approved") {
        pendingCount++;
        pendingAmount += c.claimAmount;
      } else if (c.status === "settled") {
        settledAmount += c.claimAmount;
      }
    });
    return { pendingCount, pendingAmount, settledAmount };
  }, [insuranceClaims.length]);

  // Plan actions
  const startEditPlan = (plan: InsurancePlan) => {
    setEditingPlan(plan);
    setProviderName(plan.providerName);
    setPolicyNumber(plan.policyNumber);
    setTpaName(plan.tpaName);
    setCoveragePercent(plan.coveragePercent);
    setMaxCover(plan.maxCover);
    setPlanStatus(plan.status);
    setShowPlanDlg(true);
  };

  const startCreatePlan = () => {
    setEditingPlan(null);
    setProviderName("");
    setPolicyNumber("");
    setTpaName("");
    setCoveragePercent(80);
    setMaxCover(500000);
    setPlanStatus("active");
    setShowPlanDlg(true);
  };

  const savePlan = () => {
    if (!providerName.trim() || !policyNumber.trim() || !tpaName.trim()) {
      toast.error("Please fill in Provider, TPA, and Policy details");
      return;
    }
    const planData = {
      providerName: providerName.trim(),
      policyNumber: policyNumber.trim(),
      tpaName: tpaName.trim(),
      coveragePercent: Number(coveragePercent),
      maxCover: Number(maxCover),
      status: planStatus,
    };

    if (editingPlan) {
      updateInsurancePlan(editingPlan.id, planData);
      toast.success("Insurance Plan updated successfully");
    } else {
      addInsurancePlan(planData);
      toast.success("Insurance Plan created successfully");
    }
    setShowPlanDlg(false);
    bump();
  };

  const deletePlan = (id: string) => {
    if (confirm("Are you sure you want to delete this insurance plan?")) {
      removeInsurancePlan(id);
      toast.success("Insurance Plan deleted");
      bump();
    }
  };

  // Claim actions
  const approveClaim = (claim: InsuranceClaim) => {
    updateInsuranceClaim(claim.id, { status: "approved" });
    toast.success(`Claim ${claim.id} approved. Awaiting final TPA settlement.`);
    bump();
  };

  const settleClaim = () => {
    if (!showSettleDlg) return;
    if (!utrRef.trim()) {
      toast.error("UTR / Transaction Reference is required");
      return;
    }
    
    // Update Claim
    updateInsuranceClaim(showSettleDlg.id, {
      status: "settled",
      settledAt: new Date().toISOString(),
      utrRef: utrRef.trim(),
    });

    // Update associated Invoice to fully paid
    const inv = seedInvoices.find((i) => i.id === showSettleDlg.invoiceId);
    if (inv) {
      inv.paid = true;
      inv.audit.push({
        at: new Date().toISOString(),
        by: "admin",
        note: `Insurance Claim ${showSettleDlg.id} settled. UTR: ${utrRef}`,
      });
      persistNow();
    }

    toast.success(`Claim ${showSettleDlg.id} settled & Invoice marked fully paid.`);
    setUtrRef("");
    setShowSettleDlg(null);
    bump();
  };

  const rejectClaim = () => {
    if (!showRejectDlg) return;
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    updateInsuranceClaim(showRejectDlg.id, {
      status: "rejected",
      rejectionReason: rejectionReason.trim(),
    });

    toast.error(`Claim ${showRejectDlg.id} rejected.`);
    setRejectionReason("");
    setShowRejectDlg(null);
    bump();
  };

  const CLAIM_STATUS_META: Record<InsuranceClaimStatus, { label: string; cls: string }> = {
    pending: { label: "Pending Auth", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40" },
    approved: { label: "Approved", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40" },
    rejected: { label: "Rejected", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40" },
    settled: { label: "Settled (Paid)", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40" },
  };

  return (
    <div className="space-y-6">
      {/* Stats Bento Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-semibold">Active Claims</div>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-semibold">Pending Receivables</div>
            <div className="text-2xl font-bold">₹{stats.pendingAmount.toLocaleString("en-IN")}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-semibold">Claims Settled</div>
            <div className="text-2xl font-bold">₹{stats.settledAmount.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="claims" className="w-full">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="bg-muted">
            <TabsTrigger value="claims">TPA Claims Dashboard</TabsTrigger>
            <TabsTrigger value="plans">Insurance & TPA Plans Master</TabsTrigger>
          </TabsList>
          <TabsContent value="plans" className="mt-0">
            <Button size="sm" onClick={startCreatePlan}>
              <Plus className="mr-1 h-4 w-4" /> Add Insurance Plan
            </Button>
          </TabsContent>
        </div>

        {/* Claims Tab Content */}
        <TabsContent value="claims" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between bg-card p-3 rounded-xl border">
            <div className="flex flex-1 min-w-[200px] items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patient name, MRN, Invoice ID..."
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                className="h-9 flex-1"
              />
            </div>
            <select
              value={claimStatusFilter}
              onChange={(e) => setClaimStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Claim Statuses</option>
              <option value="pending">Pending Auth</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="settled">Settled (Paid)</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Claim ID / Invoice</th>
                  <th className="px-4 py-3">Patient Details</th>
                  <th className="px-4 py-3">TPA & Policy</th>
                  <th className="px-4 py-3 text-right">Claim Amount</th>
                  <th className="px-4 py-3 text-right">Patient Co-Pay</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                      No active insurance claims match your search.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((c) => {
                    const pt = findPatient(c.patientId);
                    const plan = findInsurancePlan(c.planId);
                    const meta = CLAIM_STATUS_META[c.status];
                    return (
                      <tr key={c.id} className="hover:bg-muted/10 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-xs text-indigo-600 dark:text-indigo-400">{c.id}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{c.invoiceId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{pt?.name ?? "—"}</div>
                          <div className="text-[11px] text-muted-foreground">MRN: {pt?.mrn ?? "—"} · {pt?.age}{pt?.gender}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-xs">{plan?.providerName ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground">Policy: {plan?.policyNumber ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground">TPA: {plan?.tpaName ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          ₹{c.claimAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          ₹{c.copayAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                            {meta.label}
                          </span>
                          {c.preAuthRef && (
                            <div className="text-[9px] text-muted-foreground mt-1">Pre-Auth: {c.preAuthRef}</div>
                          )}
                          {c.utrRef && (
                            <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1">UTR: {c.utrRef}</div>
                          )}
                          {c.rejectionReason && (
                            <div className="text-[9px] text-rose-500 mt-1 truncate max-w-[120px]" title={c.rejectionReason}>
                              Reason: {c.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {c.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] text-sky-600 border-sky-500/30 hover:bg-sky-500/5" onClick={() => approveClaim(c)}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] text-rose-600 border-rose-500/30 hover:bg-rose-500/5" onClick={() => setShowRejectDlg(c)}>
                                  Reject
                                </Button>
                              </>
                            )}
                            {(c.status === "pending" || c.status === "approved") && (
                              <Button size="sm" variant="default" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => setShowSettleDlg(c)}>
                                Settle
                              </Button>
                            )}
                            {c.status === "settled" && (
                              <span className="text-[10px] text-muted-foreground italic">Settled</span>
                            )}
                            {c.status === "rejected" && (
                              <span className="text-[10px] text-rose-500 font-semibold italic">Rejected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Plans Tab Content */}
        <TabsContent value="plans" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insurancePlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border bg-card p-4 space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-base text-foreground">{plan.providerName}</h4>
                    <p className="text-xs text-muted-foreground">TPA: {plan.tpaName}</p>
                  </div>
                  <Badge variant={plan.status === "active" ? "default" : "outline"} className={plan.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : ""}>
                    {plan.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Policy No.</span>
                    <span className="font-mono font-semibold">{plan.policyNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Co-Insurance Cover</span>
                    <span className="font-semibold text-primary">{plan.coveragePercent}%</span>
                  </div>
                  <div className="col-span-2 mt-1">
                    <span className="text-muted-foreground block text-[10px] uppercase">Max Coverage Amount</span>
                    <span className="font-semibold font-mono">₹{plan.maxCover.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t justify-end">
                  <Button size="sm" variant="ghost" onClick={() => startEditPlan(plan)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => deletePlan(plan.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={showPlanDlg} onOpenChange={setShowPlanDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Insurance Plan" : "Add New Insurance Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Insurance Provider Name *</Label>
              <Input
                placeholder="e.g. Star Health Insurance"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="h-10 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>TPA Name / Partner *</Label>
                <Input
                  placeholder="e.g. Medi Assist"
                  value={tpaName}
                  onChange={(e) => setTpaName(e.target.value)}
                  className="h-10 mt-1"
                />
              </div>
              <div>
                <Label>Group Policy/Ref No. *</Label>
                <Input
                  placeholder="e.g. STAR-GP-1024"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="h-10 mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Coverage Percent (%)</Label>
                <Input
                  type="number"
                  value={coveragePercent}
                  onChange={(e) => setCoveragePercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="h-10 mt-1"
                />
              </div>
              <div>
                <Label>Max Limit / Cover Amount (₹)</Label>
                <Input
                  type="number"
                  value={maxCover}
                  onChange={(e) => setMaxCover(Number(e.target.value))}
                  className="h-10 mt-1"
                />
              </div>
            </div>
            {editingPlan && (
              <div>
                <Label>Status</Label>
                <select
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value as any)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDlg(false)}>Cancel</Button>
            <Button onClick={savePlan} className="bg-primary text-white">Save Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Dialog */}
      <Dialog open={!!showSettleDlg} onOpenChange={(v) => { if (!v) setShowSettleDlg(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Claim Settlement</DialogTitle>
          </DialogHeader>
          {showSettleDlg && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <div>Claim ID: <b>{showSettleDlg.id}</b></div>
                <div>Invoice ID: <b>{showSettleDlg.invoiceId}</b></div>
                <div>Insurance Cover Amount: <b className="text-blue-600 dark:text-blue-400">₹{showSettleDlg.claimAmount}</b></div>
                <div>Patient Co-Pay: <b>₹{showSettleDlg.copayAmount}</b></div>
              </div>
              <div className="space-y-1.5">
                <Label>UTR / Transaction Ref No. *</Label>
                <Input
                  placeholder="e.g. UTR-SBI-928394819"
                  value={utrRef}
                  onChange={(e) => setUtrRef(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettleDlg(null)}>Cancel</Button>
            <Button onClick={settleClaim} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Settle Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showRejectDlg} onOpenChange={(v) => { if (!v) setShowRejectDlg(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Insurance Claim</DialogTitle>
          </DialogHeader>
          {showRejectDlg && (
            <div className="space-y-3">
              <div className="rounded-lg bg-rose-500/5 border border-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-200">
                You are rejecting Insurance Claim <b>{showRejectDlg.id}</b>. The patient will be fully billed for the total amount of ₹{(showRejectDlg.claimAmount + showRejectDlg.copayAmount).toLocaleString("en-IN")}.
              </div>
              <div className="space-y-1.5">
                <Label>Reason for Rejection *</Label>
                <Input
                  placeholder="e.g. Missing Pre-Authorization Document"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDlg(null)}>Cancel</Button>
            <Button onClick={rejectClaim} className="bg-rose-600 hover:bg-rose-700 text-white">Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

