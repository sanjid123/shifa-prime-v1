import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Trash2,
  Pencil,
  Users,
  IndianRupee,
  PieChart,
  FileText,
  Upload,
  Download,
  Eye,
  AlertTriangle,
  ShieldCheck,
  FilePlus2,
  ScrollText,
  BadgeCheck,
  Receipt,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  partners,
  partnerTxns,
  partnerDocs,
  createPartner,
  upsertPartner,
  removePartner,
  addPartnerTxn,
  removePartnerTxn,
  addPartnerDoc,
  removePartnerDoc,
  renamePartnerDoc,
  partnerBalance,
  type Partner,
  type PartnerDocKind,
  type PartnerTxnKind,
  type PartnerRole,
} from "@/lib/mock/data";
import { canWriteAdmin } from "@/lib/roles";

const INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const DOC_KIND_LABEL: Record<PartnerDocKind, string> = {
  pan: "PAN",
  aadhaar: "Aadhaar",
  agreement: "Agreement",
  addendum: "Addendum",
  bank_proof: "Bank proof",
  other: "Other",
};

const TXN_KIND_LABEL: Record<PartnerTxnKind, string> = {
  capital_in: "Capital in",
  capital_out: "Capital withdrawal",
  profit_share: "Profit share paid",
  drawing: "Drawing",
  expense_reimb: "Expense reimbursement",
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

function emptyPartner(): Omit<Partner, "id"> {
  return {
    name: "",
    phone: "",
    email: "",
    pan: "",
    joinedAt: new Date().toISOString().slice(0, 10),
    capitalContribution: 0,
    sharePct: 0,
    role: "silent",
    active: true,
    notes: "",
  };
}

export function PartnersPanel() {
  const canWrite = canWriteAdmin();
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);

  const active = partners.find((p) => p.id === openId) ?? null;

  const totalCapital = useMemo(
    () => partners.reduce((s, p) => s + partnerBalance(p.id) + 0, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partners.length, partnerTxns.length],
  );
  const totalShare = partners.reduce((s, p) => s + (p.active ? p.sharePct : 0), 0);
  const activeCount = partners.filter((p) => p.active).length;
  const soon = Date.now() + 30 * 86400000;
  const expiringDocs = partnerDocs.filter(
    (d) => d.expiresAt && new Date(d.expiresAt).getTime() < soon,
  ).length;

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* Header */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-50/60 via-card to-emerald-50/40 dark:from-indigo-950/20 dark:via-card dark:to-emerald-950/20 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Investment Partners</h1>
              <p className="text-xs text-muted-foreground">
                Capital contributions, profit-share, and partnership documents in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatChip icon={<Users className="h-3.5 w-3.5" />} label="Partners" value={partners.length} />
            <StatChip icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Active" value={activeCount} tone="emerald" />
            <StatChip
              icon={<IndianRupee className="h-3.5 w-3.5" />}
              label="Deployed"
              value={INR(totalCapital)}
              tone="indigo"
            />
            <StatChip
              icon={<PieChart className="h-3.5 w-3.5" />}
              label="Share"
              value={`${totalShare.toFixed(1)}%`}
              tone={totalShare === 100 ? "emerald" : "amber"}
            />
            {expiringDocs > 0 && (
              <StatChip
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label="Docs expiring"
                value={expiringDocs}
                tone="amber"
              />
            )}
            {canWrite && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing({ ...emptyPartner(), id: "" });
                  setAddOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add partner
              </Button>
            )}
          </div>
        </div>
        {totalShare !== 100 && partners.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            Combined ownership is {totalShare.toFixed(1)}% (should be 100% for profit-share to
            distribute cleanly).
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {partners.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No partners yet.
            {canWrite && (
              <>
                {" "}
                <button
                  className="text-primary underline underline-offset-4"
                  onClick={() => {
                    setEditing({ ...emptyPartner(), id: "" });
                    setAddOpen(true);
                  }}
                >
                  Add your first partner
                </button>
                .
              </>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Capital</TableHead>
                <TableHead className="text-right">Share %</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Docs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => {
                const docs = partnerDocs.filter((d) => d.partnerId === p.id);
                const hasPan = docs.some((d) => d.kind === "pan");
                const hasAgr = docs.some((d) => d.kind === "agreement");
                const bal = partnerBalance(p.id);
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => setOpenId(p.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">{p.email || p.phone || "-"}</div>
                    </TableCell>
                    <TableCell className="capitalize">{p.role}</TableCell>
                    <TableCell className="text-right tabular-nums">{INR(bal)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.sharePct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.joinedAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={hasPan ? "default" : "outline"} className="h-5 px-1.5 text-[10px]">
                          PAN {hasPan ? "✓" : "•"}
                        </Badge>
                        <Badge
                          variant={hasAgr ? "default" : "outline"}
                          className="h-5 px-1.5 text-[10px]"
                        >
                          Agr {hasAgr ? "✓" : "•"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">({docs.length})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {canWrite && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditing({ ...p });
                                setAddOpen(true);
                              }}
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600"
                              onClick={() => {
                                if (!confirm(`Delete partner ${p.name}? This removes all ledger entries and documents.`)) return;
                                removePartner(p.id);
                                toast.success("Partner removed");
                                bump();
                              }}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit dialog */}
      <PartnerFormDialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) setEditing(null);
        }}
        initial={editing}
        onSaved={() => bump()}
      />

      {/* Detail drawer */}
      <Sheet open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {active && (
            <PartnerDetail
              partner={active}
              canWrite={canWrite}
              onChanged={bump}
              onClose={() => setOpenId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------- Small stat chip ------------------- */
function StatChip({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "neutral" | "emerald" | "amber" | "indigo";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-foreground/80",
    emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    indigo: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  };
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${tones[tone]}`}>
      {icon}
      <span className="text-[11px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/* ------------------- Add/Edit dialog ------------------- */
function PartnerFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Partner | null;
  onSaved: () => void;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<Omit<Partner, "id">>(() =>
    initial ? { ...initial } : emptyPartner(),
  );

  // Reset form when dialog opens with new initial
  useMemo(() => {
    if (open) setForm(initial ? { ...initial } : emptyPartner());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  function save() {
    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (form.sharePct < 0 || form.sharePct > 100) {
      toast.error("Share % must be 0-100");
      return;
    }
    if (isEdit && initial) {
      upsertPartner({ ...form, id: initial.id });
      toast.success("Partner updated");
    } else {
      createPartner(form);
      toast.success("Partner added");
    }
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit partner" : "Add partner"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="PAN">
            <Input
              value={form.pan}
              onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
              placeholder="ABCDE1234F"
            />
          </Field>
          <Field label="Joined on">
            <Input
              type="date"
              value={form.joinedAt}
              onChange={(e) => setForm({ ...form, joinedAt: e.target.value })}
            />
          </Field>
          <Field label="Capital (seed) ₹">
            <Input
              type="number"
              value={form.capitalContribution}
              onChange={(e) =>
                setForm({ ...form, capitalContribution: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Share %">
            <Input
              type="number"
              step="0.1"
              value={form.sharePct}
              onChange={(e) => setForm({ ...form, sharePct: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Role">
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v as PartnerRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="silent">Silent</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="managing">Managing</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.active ? "active" : "inactive"}
              onValueChange={(v) => setForm({ ...form, active: v === "active" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{isEdit ? "Save" : "Add partner"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/* ------------------- Detail drawer ------------------- */
function PartnerDetail({
  partner,
  canWrite,
  onChanged,
  onClose,
}: {
  partner: Partner;
  canWrite: boolean;
  onChanged: () => void;
  onClose: () => void;
}) {
  const balance = partnerBalance(partner.id);
  const txns = partnerTxns.filter((t) => t.partnerId === partner.id);
  const docs = partnerDocs.filter((d) => d.partnerId === partner.id);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center justify-between gap-3">
          <span className="truncate">{partner.name}</span>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </SheetTitle>
      </SheetHeader>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Balance" value={INR(balance)} />
        <MiniStat label="Share" value={`${partner.sharePct.toFixed(1)}%`} />
        <MiniStat label="Role" value={partner.role} />
      </div>
      <Tabs defaultValue="profile" className="mt-4">
        <TabsList className="w-full">
          <TabsTrigger value="profile" className="flex-1">
            Profile
          </TabsTrigger>
          <TabsTrigger value="ledger" className="flex-1">
            Ledger ({txns.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex-1">
            Documents ({docs.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-3 space-y-2 text-sm">
          <Row label="Email" value={partner.email || "-"} />
          <Row label="Phone" value={partner.phone || "-"} />
          <Row label="PAN" value={partner.pan || "-"} />
          <Row label="Joined" value={partner.joinedAt} />
          <Row label="Seed capital" value={INR(partner.capitalContribution)} />
          {partner.notes && (
            <div className="rounded-md border bg-muted/40 p-2 text-xs">{partner.notes}</div>
          )}
        </TabsContent>
        <TabsContent value="ledger" className="mt-3">
          <LedgerTab
            partner={partner}
            canWrite={canWrite}
            onChanged={onChanged}
          />
        </TabsContent>
        <TabsContent value="documents" className="mt-3">
          <DocsTab partner={partner} canWrite={canWrite} onChanged={onChanged} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold capitalize tabular-nums">{value}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/* ------------------- Ledger tab ------------------- */
function LedgerTab({
  partner,
  canWrite,
  onChanged,
}: {
  partner: Partner;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [distOpen, setDistOpen] = useState(false);
  const txns = partnerTxns
    .filter((t) => t.partnerId === partner.id)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-2">
      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add entry
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDistOpen(true)}>
            <Receipt className="mr-1 h-3.5 w-3.5" /> Distribute profit
          </Button>
        </div>
      )}
      {txns.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
          No ledger entries yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.map((t) => {
                const positive =
                  t.kind === "capital_in" || t.kind === "expense_reimb";
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{t.date}</TableCell>
                    <TableCell className="text-xs">{TXN_KIND_LABEL[t.kind]}</TableCell>
                    <TableCell
                      className={`text-right text-xs tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {positive ? "+" : "-"}
                      {INR(t.amount)}
                    </TableCell>
                    <TableCell className="text-xs uppercase">{t.method}</TableCell>
                    <TableCell className="text-right">
                      {canWrite && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-600"
                          onClick={() => {
                            if (!confirm("Remove this ledger entry?")) return;
                            removePartnerTxn(t.id);
                            toast.success("Entry removed");
                            onChanged();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <AddTxnDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        partnerId={partner.id}
        onSaved={onChanged}
      />
      <DistributeDialog open={distOpen} onOpenChange={setDistOpen} onSaved={onChanged} />
    </div>
  );
}

function AddTxnDialog({
  open,
  onOpenChange,
  partnerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partnerId: string;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<PartnerTxnKind>("capital_in");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"cash" | "bank" | "upi">("bank");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function save() {
    if (!amount || amount <= 0) {
      toast.error("Amount must be positive");
      return;
    }
    addPartnerTxn({ partnerId, kind, amount, method, date, reference, notes });
    toast.success("Ledger entry added");
    setAmount(0);
    setReference("");
    setNotes("");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add ledger entry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kind" className="sm:col-span-2">
            <Select value={kind} onValueChange={(v) => setKind(v as PartnerTxnKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TXN_KIND_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount ₹">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DistributeDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const active = partners.filter((p) => p.active);
  const totalShare = active.reduce((s, p) => s + p.sharePct, 0);
  const canRun = totalShare === 100 && amount > 0;

  function run() {
    if (!canRun) return;
    for (const p of active) {
      const share = (amount * p.sharePct) / 100;
      if (share <= 0) continue;
      addPartnerTxn({
        partnerId: p.id,
        kind: "profit_share",
        amount: Math.round(share),
        method: "bank",
        date,
        reference: `Distribution ${date}`,
        notes: note,
      });
    }
    toast.success(`Distributed ${INR(amount)} across ${active.length} partner(s)`);
    setAmount(0);
    setNote("");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Distribute profit share</DialogTitle>
        </DialogHeader>
        {totalShare !== 100 ? (
          <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Combined active share is {totalShare.toFixed(1)}%. Adjust shares to exactly 100% before
            distributing.
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Distributable amount ₹">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Note (period, source)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Q1 FY26" />
            </Field>
            {amount > 0 && (
              <div className="rounded-md border p-2 text-xs">
                <div className="mb-1 font-semibold">Preview</div>
                {active.map((p) => (
                  <div key={p.id} className="flex justify-between py-0.5">
                    <span>
                      {p.name} <span className="text-muted-foreground">({p.sharePct}%)</span>
                    </span>
                    <span className="tabular-nums">{INR((amount * p.sharePct) / 100)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={run} disabled={!canRun}>
            Post entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------- Documents tab ------------------- */
function DocsTab({
  partner,
  canWrite,
  onChanged,
}: {
  partner: Partner;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const docs = partnerDocs
    .filter((d) => d.partnerId === partner.id)
    .slice()
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  const [kind, setKind] = useState<PartnerDocKind>("pan");
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const hasPan = docs.some((d) => d.kind === "pan");
  const hasAgr = docs.some((d) => d.kind === "agreement");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!ALLOWED_MIME.includes(file.type)) {
          toast.error(`${file.name}: unsupported type (PDF/PNG/JPG/WebP only)`);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`${file.name}: file exceeds 5 MB`);
          continue;
        }
        const dataUrl = await readAsDataUrl(file);
        addPartnerDoc({
          partnerId: partner.id,
          kind,
          label: label.trim() || file.name,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy:
            (typeof window !== "undefined" &&
              localStorage.getItem("shifa.username")) ||
            "admin",
          expiresAt: expiresAt || undefined,
        });
      }
      toast.success("Document uploaded");
      setLabel("");
      setExpiresAt("");
      if (fileRef.current) fileRef.current.value = "";
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Completeness */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant={hasPan ? "default" : "outline"} className="gap-1">
          <ShieldCheck className="h-3 w-3" /> PAN {hasPan ? "on file" : "missing"}
        </Badge>
        <Badge variant={hasAgr ? "default" : "outline"} className="gap-1">
          <ScrollText className="h-3 w-3" /> Agreement {hasAgr ? "on file" : "missing"}
        </Badge>
      </div>

      {canWrite && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <FilePlus2 className="h-3.5 w-3.5" /> Upload document
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Kind">
              <Select value={kind} onValueChange={(v) => setKind(v as PartnerDocKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_KIND_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Label (optional)">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            <Field label="Expires (optional)">
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              {busy ? "Uploading..." : "Choose files"}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              PDF, PNG, JPG, WebP up to 5 MB.
            </span>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
          <FileText className="mx-auto mb-1 h-5 w-5 opacity-60" />
          No documents yet. Upload the partner's PAN copy and signed agreement to complete their
          file.
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {docs.map((d) => {
            const isImage = d.mimeType.startsWith("image/");
            const expired = d.expiresAt && new Date(d.expiresAt).getTime() < Date.now();
            const soon =
              d.expiresAt &&
              !expired &&
              new Date(d.expiresAt).getTime() < Date.now() + 30 * 86400000;
            return (
              <li key={d.id} className="flex items-start gap-3 p-2.5">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded border bg-muted/40">
                  {isImage ? (
                    <img
                      src={d.dataUrl}
                      alt={d.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {DOC_KIND_LABEL[d.kind]}
                    </Badge>
                    <span className="truncate text-sm font-medium">{d.label}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {d.fileName} · {(d.size / 1024).toFixed(0)} KB · by {d.uploadedBy} ·{" "}
                    {d.uploadedAt.slice(0, 10)}
                  </div>
                  {d.expiresAt && (
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={`h-5 text-[10px] ${
                          expired
                            ? "border-red-400 text-red-600"
                            : soon
                              ? "border-amber-400 text-amber-700"
                              : ""
                        }`}
                      >
                        {expired ? "Expired " : "Expires "}
                        {d.expiresAt}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => openInNewTab(d.dataUrl, d.mimeType)}
                    aria-label="View"
                    title="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <a
                    href={d.dataUrl}
                    download={d.fileName}
                    className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted"
                    aria-label="Download"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {canWrite && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          const nl = prompt("Rename document label", d.label);
                          if (nl && nl.trim()) {
                            renamePartnerDoc(d.id, nl.trim());
                            onChanged();
                          }
                        }}
                        aria-label="Rename"
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600"
                        onClick={() => {
                          if (!confirm(`Delete "${d.label}"?`)) return;
                          removePartnerDoc(d.id);
                          toast.success("Document removed");
                          onChanged();
                        }}
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
function openInNewTab(dataUrl: string, mimeType: string) {
  try {
    // Convert data URL to a blob URL so browsers render PDFs/images inline
    const [meta, b64] = dataUrl.split(",");
    const isB64 = meta.includes("base64");
    const bin = isB64 ? atob(b64) : decodeURIComponent(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    window.open(dataUrl, "_blank", "noopener,noreferrer");
  }
}
