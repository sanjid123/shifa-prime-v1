import { useEffect, useState } from "react";
import { HelpCircle, ChevronRight, X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Section = {
  id: string;
  title: string;
  intro: string;
  steps: { title: string; body: string }[];
  tip?: string;
};

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "1 · The daily loop",
    intro: "Most days in the lab follow the same 4-step loop. Master these tabs and you'll rarely need the rest.",
    steps: [
      { title: "Orders", body: "Doctors and Front Office push test requests here. Scan or click a row to review." },
      { title: "Collection", body: "Confirm patient identity, draw the sample, print the barcode label, stick it on the tube." },
      { title: "Reports", body: "Scan the tube barcode, key in values, save. Reference ranges auto-flag High / Low / Critical." },
      { title: "Billing", body: "Generate the bill (GST-exempt for healthcare) - Bills tab keeps history and reprints." },
    ],
    tip: "Keep your barcode scanner focused on the page - you can scan from anywhere.",
  },
  {
    id: "orders",
    title: "2 · Receiving orders",
    intro: "The Orders queue lists every pending test request with source, priority and patient.",
    steps: [
      { title: "Filter", body: "Use the Status and Source dropdowns to narrow the list (e.g. Pending + Doctor)." },
      { title: "Search", body: "Type barcode, order id, patient name or phone into the search bar." },
      { title: "Add tests at accessioning", body: "Click a row → 'Add tests' to pick from the searchable catalog." },
      { title: "Send to Collection", body: "Once tests are attached, click 'Send to Collection'. Order becomes ready to draw." },
    ],
  },
  {
    id: "collection",
    title: "3 · Sample collection & barcodes",
    intro: "Never draw a sample without confirming identity first. The barcode label is your traceability.",
    steps: [
      { title: "Verify", body: "Read the patient name & MRN back to them. Match phone number if needed." },
      { title: "Mark Collected", body: "Click 'Mark Collected' - timestamp and technician are auto-logged." },
      { title: "Print Barcode", body: "Click the barcode icon → opens print dialog (100×50mm label). Stick on the tube." },
    ],
    tip: "Print a fresh label if the first one smudges. Every reprint keeps the same barcode.",
  },
  {
    id: "reports",
    title: "4 · Entering results",
    intro: "The Reports tab is where the science happens. Scan the tube, key in values, done.",
    steps: [
      { title: "Scan tube", body: "Focus jumps to the scan box on load. Beep = sample opens instantly." },
      { title: "Enter values", body: "Type each number. Green = normal, amber = abnormal (H/L), red = improbable." },
      { title: "Critical value confirm", body: "Values near critical show a red confirm - you must acknowledge before saving." },
      { title: "Reagents auto-deduct", body: "Save consumes reagents (FEFO). If a batch is expired or empty, saving is blocked." },
    ],
  },
  {
    id: "verify",
    title: "5 · Issuing the patient report",
    intro: "Once results are saved, produce the branded PDF report you give the patient.",
    steps: [
      { title: "Open the sample", body: "In the Reports tab, click a card in the 'Ready' column." },
      { title: "Print Report", body: "Click the 'Print Report' button. A new tab opens with the SHIFA-branded report." },
      { title: "Print or Save as PDF", body: "Use the browser print dialog. 'Save as PDF' gives a shareable file." },
      { title: "Hand off", body: "Give to patient at pickup, or share the file. Status marks as dispatched." },
    ],
    tip: "The report includes patient details, reference ranges, flags and both signatures.",
  },
  {
    id: "reagents",
    title: "6 · Reagents, indents & purchases",
    intro: "Stock stays healthy on its own if you receive GRNs promptly and approve indents.",
    steps: [
      { title: "Reagents tab", body: "See current stock, batch expiry and min-max thresholds at a glance." },
      { title: "Auto-indents", body: "When stock drops below minimum, a draft indent is created automatically." },
      { title: "Submit for approval", body: "Indents tab → Submit. Admin approves → auto-generates a Purchase Order." },
      { title: "Receive GRN", body: "Purchases tab → open the PO → 'Receive'. Enter batch/lot/expiry → stock updates + AP entry posts." },
    ],
  },
  {
    id: "billing",
    title: "7 · Billing & bills history",
    intro: "Lab bills are GST-exempt (healthcare service, Notification 12/2017-CT).",
    steps: [
      { title: "Billing tab", body: "Pick patient (OP walk-in or MRN), add tests/packages, take payment, print." },
      { title: "Bills tab", body: "Filter by date / patient type. Re-open to reprint or edit within same day." },
    ],
  },
  {
    id: "packages",
    title: "8 · Packages & proposals",
    intro: "Curate bundles (e.g. Diabetic Profile) and propose test/price changes for admin approval.",
    steps: [
      { title: "Packages", body: "Create bundles of tests at a discounted price. Available in Billing instantly." },
      { title: "Test Proposals", body: "Propose new tests, price changes or deletions. Admin sees them in Settings → approves." },
    ],
  },
  {
    id: "shortcuts",
    title: "9 · Keyboard shortcuts",
    intro: "Fast lab = keyboard lab. Learn these three.",
    steps: [
      { title: "Barcode scanner", body: "Just scan - the page catches it. No need to click first." },
      { title: "Enter", body: "In the scan box, Enter opens the sample." },
      { title: "Esc", body: "Closes any open dialog." },
    ],
  },
];

export function LabTutorialButton() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("overview");

  // Auto-open first time
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("lab_tutorial_seen")) {
      setOpen(true);
      localStorage.setItem("lab_tutorial_seen", "1");
    }
  }, []);

  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Lab module tutorial"
        title="Lab tutorial & help"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl p-0 sm:rounded-2xl overflow-hidden">
          <DialogHeader className="border-b bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white">
            <DialogTitle className="flex items-center gap-2 text-white">
              Lab Module - Complete Guide
              <Badge className="ml-2 bg-white/20 text-white hover:bg-white/25">v1.0</Badge>
            </DialogTitle>
            <p className="mt-1 text-sm text-white/80">
              Everything a technician needs. Click through the sections on the left.
            </p>
          </DialogHeader>

          <div className="grid grid-cols-[14rem_1fr] max-h-[70vh]">
            {/* TOC */}
            <nav className="overflow-y-auto border-r bg-muted/30 py-3">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition ${
                    active === s.id
                      ? "border-l-2 border-emerald-600 bg-white font-semibold text-emerald-700"
                      : "border-l-2 border-transparent text-muted-foreground hover:bg-white/60 hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  {active === s.id && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="overflow-y-auto px-8 py-6">
              <h3 className="text-lg font-bold">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{section.intro}</p>

              {/* Illustration placeholder */}
              <div className="mt-4 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Keyboard className="h-7 w-7" />
                </div>
                <div className="mt-2 text-xs font-medium uppercase tracking-wider text-emerald-700">
                  Screenshot guide coming soon
                </div>
                <div className="text-xs text-emerald-800/70">Steps below show exactly what to do in the meantime.</div>
              </div>

              <ol className="mt-5 space-y-3">
                {section.steps.map((st, i) => (
                  <li key={i} className="flex gap-3 rounded-lg border bg-card p-3">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{st.title}</div>
                      <div className="text-sm text-muted-foreground">{st.body}</div>
                    </div>
                  </li>
                ))}
              </ol>

              {section.tip && (
                <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <span className="font-semibold">Tip:</span> {section.tip}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-3">
            <div className="text-xs text-muted-foreground">
              Reopen this guide anytime with the <HelpCircle className="inline h-3 w-3" /> button in the Lab header.
            </div>
            <Button size="sm" onClick={() => setOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <X className="mr-1 h-4 w-4" /> Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
