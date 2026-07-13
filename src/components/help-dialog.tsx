import { useEffect, useState } from "react";
import { HelpCircle, ChevronRight, X, Keyboard, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";

export type HelpSection = {
  id: string;
  title: string;
  intro: string;
  steps: { title: string; body: string }[];
  tip?: string;
};

export type ModuleKey =
  | "front-office"
  | "doctor"
  | "lab"
  | "pharmacy"
  | "admin"
  | "hr";

const PACKS: Record<ModuleKey, { title: string; accent: string; sections: HelpSection[] }> = {
  "front-office": {
    title: "Front Office - Complete Guide",
    accent: "from-sky-600 to-indigo-700",
    sections: [
      { id: "overview", title: "1 · The daily loop", intro: "Register, book, queue, bill - that's the day.", steps: [
        { title: "Patient Registration", body: "Create/update MRN. Use the phone/name lookup to avoid duplicates." },
        { title: "Doctor Booking", body: "Pick doctor + slot. A token is auto-issued." },
        { title: "Appointments", body: "Drag cards on the calendar to reschedule; right-click to cancel/no-show." },
        { title: "Procedure Bill", body: "Bill for OP procedures; print/email the receipt." },
      ] },
      { id: "search", title: "2 · Finding a patient fast", intro: "Search on phone or MRN - never re-register.", steps: [
        { title: "Type 3+ chars", body: "Suggestions appear as you type. Enter picks the top result." },
        { title: "Merge duplicates", body: "If two records exist, ask admin to merge." },
      ] },
      { id: "shortcuts", title: "3 · Keyboard shortcuts", intro: "Fewer clicks = shorter queues.", steps: [
        { title: "?", body: "Opens this help anywhere in the workspace." },
        { title: "Esc", body: "Closes any dialog." },
      ] },
    ],
  },
  doctor: {
    title: "Doctor EMR - Complete Guide",
    accent: "from-indigo-600 to-violet-700",
    sections: [
      { id: "overview", title: "1 · The consultation loop", intro: "Pick from queue → diagnose → route.", steps: [
        { title: "Queue", body: "Patients checked in by Front Office appear as cards with a token." },
        { title: "Diagnose", body: "Enter clinical notes + Rx. Allergies flag automatically." },
        { title: "Route", body: "Send to Lab, Pharmacy, or mark Done with no meds." },
      ] },
      { id: "history", title: "2 · Patient history", intro: "Every visit, Rx, lab and bill on one timeline.", steps: [
        { title: "Search", body: "MRN or phone opens the full timeline." },
        { title: "Past Rx", body: "Click any prescription to duplicate it into today's Rx." },
      ] },
      { id: "lab", title: "3 · Ordering labs", intro: "Free-text order - the lab technician picks the test panel.", steps: [
        { title: "Send to Lab", body: "Creates a pending lab order tied to this queue entry." },
        { title: "Follow-up", body: "The report appears on the patient's timeline when signed." },
      ] },
      { id: "shortcuts", title: "4 · Keyboard shortcuts", intro: "", steps: [
        { title: "?", body: "Open this help." },
        { title: "Esc", body: "Close any dialog." },
      ] },
    ],
  },
  lab: {
    title: "Lab Module - Complete Guide",
    accent: "from-emerald-600 to-teal-700",
    sections: [
      { id: "overview", title: "1 · The daily loop", intro: "Orders → Collection → Reports → Bill.", steps: [
        { title: "Orders", body: "Accept doctor/front-office requests. Add tests at accessioning." },
        { title: "Collection", body: "Confirm patient identity, draw, print barcode." },
        { title: "Reports", body: "Scan tube → enter values → save. Ranges auto-flag." },
        { title: "Billing", body: "GST-exempt for healthcare. Bills tab keeps history." },
      ], tip: "Scanners work anywhere on the page - no need to focus first." },
      { id: "reagents", title: "2 · Reagents, indents, purchases", intro: "Stock stays healthy if GRNs are prompt.", steps: [
        { title: "Auto-indent", body: "Min-max triggers create draft indents on save." },
        { title: "Approve → PO", body: "Admin approves indents to generate purchase orders." },
        { title: "GRN", body: "Receive batches, expiry & rate - stock and AP update together." },
      ] },
      { id: "reports", title: "3 · Patient result reports", intro: "Branded PDF for the patient.", steps: [
        { title: "Verify", body: "Click Print Report on a ready sample." },
        { title: "Save as PDF", body: "Use the browser print dialog to save/share." },
      ] },
    ],
  },
  pharmacy: {
    title: "Pharmacy - Complete Guide",
    accent: "from-amber-600 to-orange-700",
    sections: [
      { id: "overview", title: "1 · The daily loop", intro: "Sell, restock, reconcile.", steps: [
        { title: "Sales / POS", body: "Scan or type to add. Cart validates stock and expiry live." },
        { title: "Inventory", body: "See low-stock and expiring SKUs in one view." },
        { title: "Purchase & GRN", body: "Log purchases from distributors; batches update on receipt." },
        { title: "Returns", body: "Handle both sales and purchase returns from the Returns tab." },
      ] },
      { id: "safety", title: "2 · Dispensing safety", intro: "Watch the flags.", steps: [
        { title: "Allergies", body: "Patient allergies show at the top of the cart." },
        { title: "TallMan", body: "Look-alike names are highlighted in caps to prevent picking errors." },
      ] },
    ],
  },
  admin: {
    title: "Accounts & Admin - Complete Guide",
    accent: "from-slate-700 to-slate-900",
    sections: [
      { id: "overview", title: "1 · What lives here", intro: "Money, people, policy.", steps: [
        { title: "Daybook", body: "Every rupee in and out today, by module." },
        { title: "GST Reports", body: "GSTR-1/3B summaries; export CSV." },
        { title: "Approvals", body: "Fee/discount overrides & lab indents wait here." },
        { title: "Backup", body: "Nightly sync + manual snapshot + Google Drive export." },
      ] },
      { id: "access", title: "2 · Access control", intro: "One active session per role.", steps: [
        { title: "Add staff", body: "Create logins, assign roles, set inactivity timeout." },
        { title: "Audit log", body: "Immutable trail with CSV export." },
      ] },
    ],
  },
  hr: {
    title: "HR & Payroll - Complete Guide",
    accent: "from-emerald-600 to-cyan-700",
    sections: [
      { id: "overview", title: "1 · Staff lifecycle", intro: "Onboard, attend, pay.", steps: [
        { title: "Add Staff", body: "Name, role, department, salary structure." },
        { title: "Attendance", body: "Mark P/A/L/H per day or bulk-import." },
        { title: "Payroll", body: "Run monthly payroll; mark paid; export payslips." },
      ] },
    ],
  },
};

export function HelpDialog({
  moduleKey,
  open,
  onOpenChange,
}: {
  moduleKey: ModuleKey;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const pack = PACKS[moduleKey];
  const [active, setActive] = useState(pack.sections[0]?.id ?? "");
  const [tutorialDate, setTutorialDate] = useState<Date>(() => new Date());
  const [calOpen, setCalOpen] = useState(false);
  useEffect(() => {
    setActive(pack.sections[0]?.id ?? "");
  }, [moduleKey, pack.sections]);
  const section = pack.sections.find((s) => s.id === active) ?? pack.sections[0];
  const isFrontOffice = moduleKey === "front-office";
  const dateLabel = tutorialDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className={`border-b bg-gradient-to-r ${pack.accent} px-6 py-4 text-white`}>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-white">
            {pack.title}
            <Badge className="ml-1 bg-white/20 text-white hover:bg-white/25">v1.0</Badge>
            {isFrontOffice && (
              <button
                type="button"
                onClick={() => setCalOpen((v) => !v)}
                className="ml-auto flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25"
                aria-label="Pick tutorial date"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {dateLabel}
              </button>
            )}
          </DialogTitle>
          <p className="mt-1 text-sm text-white/80">Everything you need to master this workspace.</p>
          {isFrontOffice && calOpen && (
            <div className="mt-3 inline-block rounded-lg border border-white/20 bg-white p-2 text-foreground shadow-lg pointer-events-auto">
              <Calendar
                mode="single"
                selected={tutorialDate}
                onSelect={(d) => { if (d) { setTutorialDate(d); setCalOpen(false); } }}
                className="pointer-events-auto"
              />
            </div>
          )}
        </DialogHeader>

        <div className="grid max-h-[70vh] grid-cols-1 sm:grid-cols-[14rem_1fr]">
          <nav className="overflow-y-auto border-b bg-muted/30 py-3 sm:border-b-0 sm:border-r">
            {pack.sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition ${
                  active === s.id
                    ? "border-l-2 border-primary bg-background font-semibold text-primary"
                    : "border-l-2 border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
                }`}
              >
                <span className="truncate">{s.title}</span>
                {active === s.id && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </nav>

          <div className="overflow-y-auto px-6 py-6 sm:px-8">
            <h3 className="text-lg font-bold">{section.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{section.intro}</p>

            <ol className="mt-5 space-y-3">
              {section.steps.map((st, i) => (
                <li key={i} className="flex gap-3 rounded-lg border bg-card p-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{st.title}</div>
                    <div className="text-sm text-muted-foreground">{st.body}</div>
                  </div>
                </li>
              ))}
            </ol>

            {section.tip && (
              <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                <span className="font-semibold">Tip:</span> {section.tip}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5" /> Press <kbd className="rounded border bg-background px-1">?</kbd> anywhere to reopen.
          </div>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Icon button that opens the module's help; auto-opens once per module. */
export function HelpButton({ moduleKey, className }: { moduleKey: ModuleKey; className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `shifa.help.${moduleKey}.seen`;
    if (!localStorage.getItem(key)) {
      setOpen(true);
      localStorage.setItem(key, "1");
    }
  }, [moduleKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Open module help"
        title="Help & tutorial ( ? )"
        onClick={() => setOpen(true)}
        className={className}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
      <HelpDialog moduleKey={moduleKey} open={open} onOpenChange={setOpen} />
    </>
  );
}
