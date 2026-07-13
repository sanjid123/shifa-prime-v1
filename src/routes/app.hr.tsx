import { createFileRoute, useSearch } from "@tanstack/react-router";
import { PartnersPanel } from "@/components/partners-panel";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  CalendarCheck2,
  Wallet,
  IndianRupee,
  Printer,
  Camera,
  Pencil,
  Building2,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  staff,
  addStaff,
  removeStaff,
  updateStaff,
  getSalary,
  saveSalary,
  markAttendance,
  attendanceFor,
  daysWorked,
  runPayroll,
  markPayrollPaid,
  payrollFor,
  payrollYTD,
  type StaffMember,
  type AttendanceMark,
} from "@/lib/mock/hr";
import { departments, findDepartment } from "@/lib/mock/departments";
import { canWriteAdmin, ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/mock/data";

export const Route = createFileRoute("/app/hr")({
  head: () => ({ meta: [{ title: "HR & Payroll · Shifa HMS" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab as string) ?? "staff" }),
  component: HRPage,
});

const ROLES: Role[] = ["front_office", "doctor", "lab", "pharmacy", "accountant", "admin"];

function HRPage() {
  const { tab } = useSearch({ from: "/app/hr" });
  if (tab === "partners") return <PartnersPanel />;
  return <StaffPayrollPage />;
}

function StaffPayrollPage() {
  const canWrite = canWriteAdmin();
  const [sel, setSel] = useState<string>(staff[0]?.id ?? "");
  const [, force] = useState(0);
  const bump = () => force((n) => n + 1);
  const active = useMemo(() => staff.find((s) => s.id === sel), [sel]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const activeCount = staff.filter((s) => s.active).length;
  const onLeaveToday = staff.filter((s) => {
    const es = attendanceFor(s.id, todayISO.slice(0, 7));
    return es.some((e) => e.date === todayISO && (e.mark === "L" || e.mark === "H"));
  }).length;

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="rounded-2xl border bg-gradient-to-br from-emerald-50/60 via-card to-sky-50/40 dark:from-emerald-950/20 dark:via-card dark:to-sky-950/20 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">HR &amp; Payroll</h1>
              <p className="text-xs text-muted-foreground">Care for the people who care for patients - attendance, salary and payroll in one calm workspace.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatChip label="Staff" value={staff.length} tone="neutral" />
            <StatChip label="Active" value={activeCount} tone="emerald" />
            <StatChip label="On leave today" value={onLeaveToday} tone="amber" />
            {canWrite && (
              <AddStaffButton
                onAdded={(s) => {
                  setSel(s.id);
                  bump();
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border bg-card">
          <div className="border-b p-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Staff · {staff.length}
          </div>
          <ul className="max-h-[70vh] divide-y overflow-y-auto">
            {staff.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSel(s.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${sel === s.id ? "bg-primary/10" : "hover:bg-muted/50"}`}
                >
                  {s.avatarUrl ? (
                    <img
                      src={s.avatarUrl}
                      alt={s.name}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {s.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {ROLE_LABEL[s.role]}
                      {s.departmentId ? ` · ${findDepartment(s.departmentId)?.code ?? ""}` : ""}
                      {!s.active && " · inactive"}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="min-w-0 space-y-4">
          {!active ? (
            <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Select a staff member.
            </div>
          ) : (
            <StaffDetail
              key={active.id}
              member={active}
              canWrite={canWrite}
              onChange={bump}
              onRemoved={() => {
                setSel(staff[0]?.id ?? "");
                bump();
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number | string; tone: "neutral" | "emerald" | "amber" | "sky" }) {
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
      : tone === "amber"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
        : tone === "sky"
          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
          : "bg-muted text-foreground border-border";
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${toneCls}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function AddStaffButton({ onAdded }: { onAdded: (s: StaffMember) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Staff
        </Button>
      </DialogTrigger>
      <StaffFormDialog
        onClose={() => setOpen(false)}
        onSaved={(s) => {
          onAdded(s);
          setOpen(false);
        }}
      />
    </Dialog>
  );
}

function StaffFormDialog({
  onSaved,
  onClose,
  initial,
}: {
  onSaved: (s: StaffMember) => void;
  onClose: () => void;
  initial?: StaffMember;
}) {
  const isEdit = !!initial;
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initial?.avatarUrl);
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? "front_office");
  const [departmentId, setDepartmentId] = useState<string>(initial?.departmentId ?? "");
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [gender, setGender] = useState<StaffMember["gender"]>(initial?.gender ?? "M");
  const [dob, setDob] = useState(initial?.dob ?? "");
  const [nationality, setNationality] = useState(initial?.nationality ?? "");
  const [language, setLanguage] = useState(initial?.language ?? "");
  const [maritalStatus, setMaritalStatus] = useState<StaffMember["maritalStatus"]>(
    initial?.maritalStatus ?? "Single",
  );
  const [permanentAddress, setPermanent] = useState(initial?.permanentAddress ?? "");
  const [currentAddress, setCurrent] = useState(initial?.currentAddress ?? "");
  const [bankAccount, setBankAcc] = useState(initial?.bankAccount ?? "");
  const [bankName, setBankName] = useState(initial?.bankName ?? "");
  const [accountHolder, setHolder] = useState(initial?.accountHolder ?? "");
  const [taxCode, setTaxCode] = useState(initial?.taxCode ?? "");
  const [insuranceCode, setIns] = useState(initial?.insuranceCode ?? "");
  const [identifyCode, setIdent] = useState(initial?.identifyCode ?? "");
  const [hometown, setHometown] = useState(initial?.hometown ?? "");
  const [religion, setReligion] = useState(initial?.religion ?? "");
  const [joinedOn, setJoined] = useState(
    initial?.joinedOn ?? new Date().toISOString().slice(0, 10),
  );
  const [active, setActive] = useState(initial?.active ?? true);

  const onPickPhoto = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image too large (max 4MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      // resize to max 320px on canvas to keep localStorage small
      const img = new Image();
      img.onload = () => {
        const max = 320;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!name.trim() || !username.trim()) {
      toast.error("Name and username are required");
      return;
    }
    if (!isEdit && !password.trim()) {
      toast.error("Set an initial password");
      return;
    }
    const payload = {
      name: name.trim(),
      role,
      username: username.trim().toLowerCase(),
      mobile,
      email,
      joinedOn,
      active,
      avatarUrl,
      designation,
      departmentId: departmentId || undefined,
      gender,
      dob,
      nationality,
      language,
      maritalStatus,
      permanentAddress,
      currentAddress,
      bankAccount,
      bankName,
      accountHolder,
      taxCode,
      insuranceCode,
      identifyCode,
      hometown,
      religion,
    };
    if (isEdit && initial) {
      updateStaff(initial.id, payload);
      toast.success(`${name} updated`);
      onSaved({ ...initial, ...payload });
    } else {
      const s = addStaff({ ...payload, password });
      toast.success(`${s.name} added · sign in as @${s.username}`);
      onSaved(s);
    }
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>
          {isEdit ? `Edit staff · ${initial?.name}` : "Add new staff member"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-32 w-32 rounded-full object-cover ring-4 ring-primary/10"
              />
            ) : (
              <div className="grid h-32 w-32 place-items-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-4 ring-primary/10">
                {(name || "?")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow"
              title="Upload photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickPhoto(f);
            }}
          />
          {avatarUrl && (
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-destructive"
              onClick={() => setAvatarUrl(undefined)}
            >
              Remove photo
            </button>
          )}
          <div className="mt-2 text-center">
            <div className="text-sm font-semibold">{name || "New staff"}</div>
            <div className="text-[11px] text-muted-foreground">
              {designation || ROLE_LABEL[role]}
            </div>
          </div>
        </div>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-2">
          <section>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Profile
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label className="text-xs">Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Designation</Label>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. UI/UX Designer"
                />
              </div>
              <div>
                <Label className="text-xs">Gender</Label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as StaffMember["gender"])}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Date of birth</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Identify code</Label>
                <Input value={identifyCode} onChange={(e) => setIdent(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Hometown</Label>
                <Input value={hometown} onChange={(e) => setHometown(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Nationality</Label>
                <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Language</Label>
                <Input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. English, Malayalam"
                />
              </div>
              <div>
                <Label className="text-xs">Religion</Label>
                <Input value={religion} onChange={(e) => setReligion(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Marital status</Label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value as StaffMember["maritalStatus"])}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option>Single</option>
                  <option>Married</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </section>
          <section>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Account & role
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label className="text-xs">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isEdit}
                />
              </div>
              {!isEdit && (
                <div>
                  <Label className="text-xs">Initial password</Label>
                  <Input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set login password"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Role</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">- unassigned -</option>
                  {departments
                    .filter((d) => d.active)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.code}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Joined on</Label>
                <Input type="date" value={joinedOn} onChange={(e) => setJoined(e.target.value)} />
              </div>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />{" "}
                Active account
              </label>
            </div>
          </section>
          <section>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Contact & address
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label className="text-xs">Phone number</Label>
                <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Permanent address</Label>
                <Input value={permanentAddress} onChange={(e) => setPermanent(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Current address</Label>
                <Input value={currentAddress} onChange={(e) => setCurrent(e.target.value)} />
              </div>
            </div>
          </section>
          <section>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Bank & tax (optional)
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label className="text-xs">Bank account</Label>
                <Input value={bankAccount} onChange={(e) => setBankAcc(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Account name</Label>
                <Input value={accountHolder} onChange={(e) => setHolder(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bank</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Tax code</Label>
                <Input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Insurance code</Label>
                <Input value={insuranceCode} onChange={(e) => setIns(e.target.value)} />
              </div>
            </div>
          </section>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>{isEdit ? "Save changes" : "Create staff"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function StaffDetail({
  member,
  canWrite,
  onChange,
  onRemoved,
}: {
  member: StaffMember;
  canWrite: boolean;
  onChange: () => void;
  onRemoved: () => void;
}) {
  const ytd = payrollYTD(member.id, new Date().getFullYear());
  const [editOpen, setEditOpen] = useState(false);
  const dept = findDepartment(member.departmentId);
  return (
    <>
      <div className="rounded-2xl border bg-card p-5">
        <div className="grid gap-5 md:grid-cols-[132px_1fr]">
          <div className="flex flex-col items-center">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-primary/10"
              />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-full bg-primary/10 text-2xl font-bold text-primary ring-4 ring-primary/10">
                {member.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-bold leading-tight">{member.name}</div>
                <div className="mt-1 text-sm text-primary">
                  {member.designation || ROLE_LABEL[member.role]}
                  {dept && <span className="ml-2 text-muted-foreground">| {dept.name}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {canWrite && (
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <StaffFormDialog
                      initial={member}
                      onClose={() => setEditOpen(false)}
                      onSaved={() => {
                        setEditOpen(false);
                        onChange();
                      }}
                    />
                  </Dialog>
                )}
                {canWrite && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Remove ${member.name}?`)) {
                        removeStaff(member.id);
                        toast.success("Removed");
                        onRemoved();
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <InfoRow label="Staff ID" value={member.staffCode ?? "-"} mono />
              <InfoRow label="Phone number" value={member.mobile || "-"} />
              <InfoRow label="Staff Account" value={`@${member.username}`} mono />
              <InfoRow label="Email" value={member.email || "-"} />
              <InfoRow label="Department" value={dept?.name ?? "Unassigned"} />
              <InfoRow label="Joined" value={member.joinedOn} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard
          title="Personal information"
          rows={[
            [
              "Gender",
              member.gender === "F"
                ? "Female"
                : member.gender === "M"
                  ? "Male"
                  : member.gender || "-",
            ],
            ["Date of birth", member.dob || "-"],
            ["Identify code", member.identifyCode || "-"],
            ["Hometown", member.hometown || "-"],
            ["Nationality", member.nationality || "-"],
            ["Religion", member.religion || "-"],
            ["Language", member.language || "-"],
            ["Marital status", member.maritalStatus || "-"],
            ["Permanent address", member.permanentAddress || "-"],
            ["Current address", member.currentAddress || "-"],
          ]}
        />
        <ProfileCard
          title="Account information"
          rows={[
            ["Bank account", member.bankAccount || "-"],
            ["Account name", member.accountHolder || "-"],
            ["Bank", member.bankName || "-"],
            ["Tax code", member.taxCode || "-"],
            ["Insurance code", member.insuranceCode || "-"],
          ]}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatBadge label="Days worked (YTD)" value={String(ytd.daysWorked)} />
        <StatBadge label="Total paid" value={`₹${ytd.totalPaid.toLocaleString("en-IN")}`} />
        <StatBadge label="Pending" value={`₹${ytd.pending.toLocaleString("en-IN")}`} />
      </div>

      <Tabs defaultValue="attendance">
        <TabsList className="h-10 rounded-full border bg-muted/40 p-1">
          <TabsTrigger value="attendance" className="rounded-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <CalendarCheck2 className="mr-1 h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="salary" className="rounded-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <Wallet className="mr-1 h-4 w-4" />
            Salary Structure
          </TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
            <IndianRupee className="mr-1 h-4 w-4" />
            Payroll Runs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-3">
          <AttendanceGrid staffId={member.id} canWrite={canWrite} onChange={onChange} />
        </TabsContent>

        <TabsContent value="salary" className="mt-3">
          <SalaryEditor staffId={member.id} canWrite={canWrite} onSaved={onChange} />
        </TabsContent>

        <TabsContent value="payroll" className="mt-3">
          <PayrollView staffId={member.id} canWrite={canWrite} onChange={onChange} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function AttendanceGrid({
  staffId,
  canWrite,
  onChange,
}: {
  staffId: string;
  canWrite: boolean;
  onChange: () => void;
}) {
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const entries = attendanceFor(staffId, month);
  const map = new Map(entries.map((e) => [e.date, e.mark]));

  const cycle = (day: number) => {
    if (!canWrite) return;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (date > todayISO) return;
    const cur = map.get(date);
    const next: AttendanceMark = cur === "P" ? "A" : cur === "A" ? "L" : cur === "L" ? "H" : "P";
    markAttendance(staffId, date, next);
    onChange();
  };
  const worked = daysWorked(staffId, month);

  const styleFor = (m?: string) =>
    m === "P"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      : m === "A"
        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
        : m === "L"
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
          : m === "H"
            ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
            : "bg-background text-muted-foreground border-border";

  const legendDot = (cls: string) => <span className={`inline-block h-1.5 w-1.5 rounded-full ${cls}`} />;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Month</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 w-44"
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">{legendDot("bg-emerald-500")} P Present</span>
          <span className="flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-rose-700 dark:text-rose-300">{legendDot("bg-rose-500")} A Absent</span>
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">{legendDot("bg-amber-500")} L Leave</span>
          <span className="flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300">{legendDot("bg-sky-500")} H Half</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10 md:grid-cols-14">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const date = `${month}-${String(d).padStart(2, "0")}`;
          const mark = map.get(date);
          const isFuture = date > todayISO;
          const isToday = date === todayISO;
          const disabled = !canWrite || isFuture;
          return (
            <button
              key={d}
              onClick={() => cycle(d)}
              disabled={disabled}
              title={isFuture ? "Future date - cannot mark" : undefined}
              aria-label={isFuture ? `Day ${d} (future)` : `Day ${d}`}
              className={`aspect-square rounded-lg border text-center text-xs font-semibold transition ${
                isFuture
                  ? "cursor-not-allowed border-dashed bg-muted/30 text-muted-foreground/40"
                  : `${styleFor(mark)} ${canWrite ? "cursor-pointer hover:brightness-110 hover:shadow-sm" : "cursor-default"}`
              } ${isToday ? "ring-2 ring-emerald-500/50 ring-offset-1 ring-offset-background" : ""}`}
            >
              <div className="text-[10px] opacity-60">{d}</div>
              <div>{isFuture ? "" : mark ?? "·"}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        Days worked this month: <b className="text-foreground tabular-nums">{worked}</b> / {daysInMonth}
      </div>
    </div>
  );
}

function SalaryEditor({
  staffId,
  canWrite,
  onSaved,
}: {
  staffId: string;
  canWrite: boolean;
  onSaved: () => void;
}) {
  const cur = getSalary(staffId);
  const [basic, setBasic] = useState(cur.basic);
  const [hra, setHra] = useState(cur.hra);
  const [allow, setAllow] = useState(cur.allowances);
  const [ded, setDed] = useState(cur.deductions);
  const [pf, setPf] = useState(cur.pf);
  const [esi, setEsi] = useState(cur.esi);
  const gross = basic + hra + allow;
  const pfAmt = pf ? Math.round(basic * 0.12) : 0;
  const esiAmt = esi ? Math.round(gross * 0.0075) : 0;
  const net = gross - ded - pfAmt - esiAmt;

  const save = () => {
    saveSalary({ staffId, basic, hra, allowances: allow, deductions: ded, pf, esi });
    toast.success("Salary structure saved");
    onSaved();
  };

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
      <div className="space-y-3">
        <NumField label="Basic ₹" v={basic} set={setBasic} disabled={!canWrite} />
        <NumField label="HRA ₹" v={hra} set={setHra} disabled={!canWrite} />
        <NumField label="Allowances ₹" v={allow} set={setAllow} disabled={!canWrite} />
        <NumField label="Other deductions ₹" v={ded} set={setDed} disabled={!canWrite} />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pf}
              onChange={(e) => setPf(e.target.checked)}
              disabled={!canWrite}
            />{" "}
            PF (12% of basic)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={esi}
              onChange={(e) => setEsi(e.target.checked)}
              disabled={!canWrite}
            />{" "}
            ESI (0.75%)
          </label>
        </div>
        {canWrite && <Button onClick={save}>Save structure</Button>}
      </div>
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="text-xs uppercase text-muted-foreground">Estimated monthly</div>
        <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
          <span>Gross</span>
          <span className="text-right font-mono">₹{gross.toLocaleString("en-IN")}</span>
          <span>PF</span>
          <span className="text-right font-mono text-rose-600">
            -₹{pfAmt.toLocaleString("en-IN")}
          </span>
          <span>ESI</span>
          <span className="text-right font-mono text-rose-600">
            -₹{esiAmt.toLocaleString("en-IN")}
          </span>
          <span>Other deductions</span>
          <span className="text-right font-mono text-rose-600">
            -₹{ded.toLocaleString("en-IN")}
          </span>
          <span className="font-semibold">Net pay</span>
          <span className="text-right font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400">
            ₹{net.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}

function NumField({
  label,
  v,
  set,
  disabled,
}: {
  label: string;
  v: number;
  set: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={v}
        onChange={(e) => set(Number(e.target.value))}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}

function PayrollView({
  staffId,
  canWrite,
  onChange,
}: {
  staffId: string;
  canWrite: boolean;
  onChange: () => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const runs = payrollFor(staffId);

  const run = () => {
    const [y, m] = month.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    const r = runPayroll(staffId, month, dim);
    toast.success(`Payroll processed · Net ₹${r.net.toLocaleString("en-IN")}`);
    onChange();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
        <div>
          <Label className="text-xs">Payroll month</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        {canWrite && (
          <Button onClick={run}>
            <IndianRupee className="mr-1 h-4 w-4" />
            Run payroll
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Month</th>
              <th className="px-3 py-2 text-right">Days</th>
              <th className="px-3 py-2 text-right">Gross</th>
              <th className="px-3 py-2 text-right">Deductions</th>
              <th className="px-3 py-2 text-right">Net</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                  No payroll runs yet.
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-1.5 font-mono">{r.month}</td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {r.daysWorked}/{r.daysInMonth}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    ₹{r.gross.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-rose-600">
                    ₹{r.deductions.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold">
                    ₹{r.net.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-1.5">
                    {r.paidOn ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        Paid · {r.mode}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {!r.paidOn && (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            markPayrollPaid(r.id, "cash");
                            onChange();
                            toast.success("Marked paid · Cash");
                          }}
                        >
                          Cash
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            markPayrollPaid(r.id, "upi");
                            onChange();
                            toast.success("Marked paid · UPI");
                          }}
                        >
                          UPI
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            markPayrollPaid(r.id, "bank");
                            onChange();
                            toast.success("Marked paid · Bank");
                          }}
                        >
                          Bank
                        </Button>
                      </div>
                    )}
                    {r.paidOn && (
                      <Button size="sm" variant="ghost" onClick={() => window.print()}>
                        <Printer className="mr-1 h-3.5 w-3.5" />
                        Payslip
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// keep reference to updateStaff for future edit flow
void updateStaff;

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "font-mono text-sm" : "text-sm"}`}>{value}</span>
    </div>
  );
}

function ProfileCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="py-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="text-sm font-medium">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold">{value}</div>
    </div>
  );
}
