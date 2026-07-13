import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { persistNow } from "@/lib/mock/data";

export type PrintFormat = "a5" | "a4" | "thermal80" | "thermal58";

const FORMATS: { value: PrintFormat; label: string; width: string; height: string }[] = [
  { value: "a5", label: "A5 (default)", width: "148mm", height: "210mm" },
  { value: "a4", label: "A4", width: "210mm", height: "297mm" },
  { value: "thermal80", label: "Thermal 80mm", width: "80mm", height: "auto" },
  { value: "thermal58", label: "Thermal 58mm", width: "58mm", height: "auto" },
];

const STORAGE_KEY = "shifa.printFormat";

export function BillPrintPreview({
  invoiceId,
  open,
  onClose,
  defaultFormat,
}: {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
  defaultFormat?: PrintFormat;
}) {
  const [format, setFormat] = useState<PrintFormat>(() => {
    if (typeof window === "undefined") return defaultFormat ?? "a5";
    return (localStorage.getItem(STORAGE_KEY) as PrintFormat) || defaultFormat || "a5";
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, format);
  }, [format]);

  // Ensure the just-saved invoice is available to the iframe's fresh JS realm.
  // Must run synchronously during render (before iframe src is created) -
  // a useEffect fires AFTER the iframe already loaded from empty localStorage.
  if (open && invoiceId) persistNow();
  useEffect(() => { if (open && invoiceId) persistNow(); }, [open, invoiceId]);

  const fmt = FORMATS.find((f) => f.value === format)!;

  const doPrint = () => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.focus();
      w.print();
    } catch {
      // ignore
    }
  };

  if (!invoiceId) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3 space-y-0">
          <DialogTitle className="text-sm font-semibold">Bill Preview · <span className="font-mono">{invoiceId}</span></DialogTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as PrintFormat)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </DialogHeader>

        <div className="max-h-[72vh] overflow-auto bg-neutral-200 p-4 dark:bg-neutral-800">
          <div
            className="mx-auto bg-white shadow-md"
            style={{ width: fmt.width, minHeight: fmt.height === "auto" ? "220px" : fmt.height }}
          >
            <iframe
              ref={iframeRef}
              key={`${invoiceId}-${format}`}
              title="bill-preview"
              src={`/print/bill/${invoiceId}?format=${format}&embed=1`}
              className="block h-[70vh] w-full border-0 bg-white"
            />
          </div>
        </div>

        <DialogFooter className="border-t px-4 py-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={doPrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

