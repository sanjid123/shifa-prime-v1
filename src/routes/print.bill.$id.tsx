import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import header from "@/assets/shifa-header.png";
import { doctors, drugs, invoices, findPatient, invoiceTotal, type Invoice, type InvoiceLine } from "@/lib/mock/data";

type Format = "a5" | "a4" | "thermal80" | "thermal58";

export const Route = createFileRoute("/print/bill/$id")({
  ssr: false,
  component: PrintBill,
  validateSearch: (s: Record<string, unknown>): { format: Format; embed: boolean } => {
    const allowed = ["a5", "a4", "thermal80", "thermal58"] as const;
    const f = allowed.includes(s.format as Format) ? (s.format as Format) : "a5";
    return { format: f, embed: s.embed === "1" || s.embed === 1 || s.embed === true };
  },
});

const PAGE_CSS: Record<Format, string> = {
  a5: "@page{size:A5;margin:8mm}",
  a4: "@page{size:A4;margin:12mm}",
  thermal80: "@page{size:80mm auto;margin:3mm}",
  thermal58: "@page{size:58mm auto;margin:2mm}",
};

const WIDTH_CLASS: Record<Format, string> = {
  a5: "max-w-[148mm]",
  a4: "max-w-[210mm]",
  thermal80: "max-w-[80mm] text-[10px]",
  thermal58: "max-w-[58mm] text-[9px]",
};

function fmtMoney(n: number) {
  return n.toFixed(2);
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtExpiry(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { month: "2-digit", year: "2-digit" });
}

function fallbackDrug(line: InvoiceLine) {
  return drugs.find((d) => d.id === line.drugId) ?? drugs.find((d) => d.name === line.desc);
}

function lineMeta(line: InvoiceLine) {
  const d = fallbackDrug(line);
  return {
    hsn: line.hsn ?? d?.hsn ?? "3004",
    rack: line.rack ?? d?.rack ?? "-",
    manufacturer: line.manufacturer ?? d?.manufacturer ?? "-",
    batch: line.batch ?? d?.batch ?? "-",
    expiry: line.expiry ?? d?.expiry ?? "-",
    mrp: line.mrp ?? line.rate,
  };
}

function walkInName(inv: Invoice) {
  const note = inv.audit[0]?.note ?? "";
  if (!note.startsWith("Walk-in")) return "Walk-in";
  return note.split("·")[1]?.trim() || "Walk-in";
}

function doctorName(inv: Invoice) {
  return inv.doctorName ?? doctors.find((d) => d.id === inv.prescribedBy)?.name ?? "-";
}

function PrintBill() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const format = search.format as Format;
  const embed = search.embed as boolean;
  const inv = invoices.find((i) => i.id === id) as Invoice | undefined;
  const router = useRouter();
  const p = inv ? findPatient(inv.patientId) : undefined;
  const t = inv ? invoiceTotal(inv) : undefined;
  const isThermal = format === "thermal80" || format === "thermal58";
  const isPharmacy = inv?.department === "pharmacy";

  useEffect(() => {
    document.title = `${id} · Shifa Clinic Bill`;
  }, [id]);

  if (!inv || !t) {
    return (
      <div className="grid min-h-screen place-items-center bg-white p-6 text-center text-black">
        <div>
          <div className="text-lg font-semibold">Invoice not found</div>
          <div className="mt-1 text-xs text-gray-600">Close this preview and try Save &amp; Print again.</div>
        </div>
      </div>
    );
  }

  const roundedTotal = Math.round(t.total);
  const roundOff = +(roundedTotal - t.total).toFixed(2);

  if (isPharmacy) {
    const patientName = p?.name ?? walkInName(inv);
    const patientAge = p ? `${p.age}${p.gender}` : "-";
    return (
      <div className={`${embed ? "bg-white" : "min-h-screen bg-muted/40 py-4"} print:bg-white print:py-0`}>
        <style>{`${PAGE_CSS[format]}${embed ? "html,body{margin:0;padding:0;background:#fff}" : ""}`}</style>
        {!embed && (
          <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between px-4">
            <Button variant="outline" onClick={() => router.history.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
            <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print bill</Button>
          </div>
        )}

        <div className={`print-container mx-auto ${WIDTH_CLASS[format]} bg-white ${isThermal ? "p-2" : "p-6"} text-black ${embed ? "" : "shadow-sm"} print:shadow-none`}>
          {!isThermal ? (
            <>
              <img src={header} alt="Shifa Clinic · Kalladi Building, Killirani, Karakurissi" className="w-full" />
              <hr className="my-3 border-t-2 border-black" />
            </>
          ) : (
            <div className="text-center">
              <div className="text-sm font-bold uppercase tracking-wide">Shifa Clinic</div>
              <div className="text-[9px]">Kalladi Bldg, Killirani, Karakurissi</div>
              <div className="text-[9px]">+91 9207 510 555</div>
              <div className="mt-1 text-[10px] font-bold uppercase">Pharmacy Bill</div>
            </div>
          )}

          <div className="my-2 border-y border-black py-1">
            <div className="grid grid-cols-2 gap-2 text-[10px] leading-5">
              <div>
                <div>Bill Date : <b>{fmtDateTime(inv.date)}</b></div>
                <div>Bill No : <b>{inv.id}</b></div>
                <div>Token No : <b>{inv.token ?? "-"}</b></div>
              </div>
              <div>
                <div>OP NO : <b>{inv.opVisitId ?? (inv.patientType === "IP" ? "IPD" : "OPD")}</b></div>
                <div>REG NO : <b>{p?.mrn ?? "-"}</b></div>
                <div>Patient : <b>{patientName}</b></div>
                <div>Age : <b>{patientAge}</b></div>
                <div>Prescribed by Dr : <b>{doctorName(inv)}</b></div>
              </div>
            </div>
          </div>

          <table className={`w-full border-collapse ${isThermal ? "text-[8.5px]" : "text-[11px]"}`}>
            <thead>
              <tr className="border-b border-black text-left align-bottom">
                <th className="py-1 pr-1">HSN</th>
                <th className="py-1 pr-1">RACK</th>
                <th className="py-1 pr-1">Particulars</th>
                <th className="py-1 pr-1">Mfr</th>
                <th className="py-1 pr-1">Batch</th>
                <th className="py-1 pr-1">Expiry</th>
                <th className="py-1 pr-1 text-right">Qty</th>
                <th className="py-1 pr-1 text-right">MRP</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((line, i) => {
                const meta = lineMeta(line);
                return (
                  <tr key={i} className="border-b border-gray-300 align-top">
                    <td className="py-1 pr-1 font-mono">{meta.hsn}</td>
                    <td className="py-1 pr-1">{meta.rack}</td>
                    <td className="py-1 pr-1 font-medium">{line.desc}</td>
                    <td className="py-1 pr-1">{meta.manufacturer}</td>
                    <td className="py-1 pr-1 font-mono">{meta.batch}</td>
                    <td className="py-1 pr-1 font-mono">{fmtExpiry(meta.expiry)}</td>
                    <td className="py-1 pr-1 text-right font-mono">{line.qty}</td>
                    <td className="py-1 pr-1 text-right font-mono">{fmtMoney(meta.mrp)}</td>
                    <td className="py-1 text-right font-mono">{fmtMoney(line.qty * line.rate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-2 border-y border-black py-1">
            <div className="grid grid-cols-2 gap-2 text-[10px] leading-5">
              <div>
                <div>CGST : <b className="font-mono">₹ {fmtMoney(t.cgst)}</b></div>
                <div>SGST : <b className="font-mono">₹ {fmtMoney(t.sgst)}</b></div>
              </div>
              <div className="text-right">
                <div>TOTAL : <b className="font-mono">₹ {fmtMoney(t.subtotal)}</b></div>
                <div>Discount : <b className="font-mono">₹ {fmtMoney(t.discount)}</b></div>
                <div>Round Off : <b className="font-mono">{roundOff >= 0 ? "+" : ""}{fmtMoney(roundOff)}</b></div>
                <div className="text-sm font-bold">Net Amount : <span className="font-mono">₹ {roundedTotal.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-2 text-center text-[10px] font-medium">Your health is our priority. Take medicines as advised.</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[9px]">
            <div>Prepared by :<br /><span className="inline-block min-h-5" /></div>
            <div>Delivered by :<br /><span className="inline-block min-h-5" /></div>
            <div>Cashier :<br /><span className="inline-block min-h-5" /></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${embed ? "bg-white" : "min-h-screen bg-muted/40 py-4"} print:bg-white print:py-0`}>
      <style>{`${PAGE_CSS[format]}${embed ? "html,body{margin:0;padding:0;background:#fff}" : ""}`}</style>
      {!embed && (
        <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between px-4">
          <Button variant="outline" onClick={() => router.history.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print bill</Button>
        </div>
      )}

      <div className={`print-container mx-auto ${WIDTH_CLASS[format]} bg-white ${isThermal ? "p-2" : "p-6"} text-black ${embed ? "" : "shadow-sm"} print:shadow-none`}>

        {/* Letterhead · hide big header on tiny thermal */}
        {!isThermal ? (
          <>
            <img src={header} alt="Shifa Clinic · Kalladi Building, Killirani, Karakurissi" className="w-full" />
            <hr className="my-3 border-t-2 border-black" />
          </>
        ) : (
          <div className="mb-2 text-center">
            <div className="text-sm font-bold uppercase">Shifa Clinic</div>
            <div className="text-[9px]">Kalladi Bldg, Killirani, Karakurissi</div>
            <div className="text-[9px]">+91 9207 510 555</div>
            <hr className="my-1 border-t border-black" />
          </div>
        )}

        <div className={`flex ${isThermal ? "flex-col gap-1" : "items-start justify-between"}`}>
          <div>
            {!isThermal && <h1 className="text-base font-bold uppercase tracking-wider">{t.gst > 0 ? "Tax Invoice" : "Bill / Invoice"}</h1>}
            <div className="text-xs">Invoice: <b>{inv.id}</b></div>
            <div className="text-xs">Date: {new Date(inv.date).toLocaleString()}</div>
            {inv.token != null && <div className="text-xs">Token: <b>{inv.token}</b></div>}
            {inv.doctorName && <div className="text-xs">Doctor: <b>{inv.doctorName}</b></div>}
            {t.gst > 0 && <div className="text-xs">GSTIN: <b>32ABCDE1234F1Z5</b></div>}
          </div>
          <div className={isThermal ? "text-xs" : "text-right text-sm"}>
            <div><b>Patient:</b> {p?.name ?? inv.opPatient?.name ?? "Walk-in"}</div>
            <div>MRN: {p?.mrn ?? "WALK-IN"}</div>
            <div>{p ? `${p.age}${p.gender} · ${p.phone}` : (inv.opPatient ? `${inv.opPatient.age ?? "-"}${inv.opPatient.gender ?? ""} · ${inv.opPatient.phone}` : "-")}</div>
          </div>
        </div>


        <table className={`mt-3 w-full border-collapse ${isThermal ? "text-[10px]" : "text-sm"}`}>
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1">#</th>
              <th className="py-1">Description</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i} className="border-b border-gray-300">
                <td className="py-1">{i + 1}</td>
                <td className="py-1">{l.desc}</td>
                <td className="py-1 text-right font-mono">{l.qty}</td>
                <td className="py-1 text-right font-mono">{l.rate.toFixed(2)}</td>
                <td className="py-1 text-right font-mono">{(l.qty * l.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={4} className="pt-2 text-right">Subtotal</td><td className="pt-2 text-right font-mono">{t.subtotal.toFixed(2)}</td></tr>
            <tr><td colSpan={4} className="text-right">Discount</td><td className="text-right font-mono">- {t.discount.toFixed(2)}</td></tr>
            {t.gst > 0 && (
              <>
                <tr><td colSpan={4} className="text-right">Taxable</td><td className="text-right font-mono">{t.taxable.toFixed(2)}</td></tr>
                <tr><td colSpan={4} className="text-right">CGST @ {t.gstRate / 2}%</td><td className="text-right font-mono">{t.cgst.toFixed(2)}</td></tr>
                <tr><td colSpan={4} className="text-right">SGST @ {t.gstRate / 2}%</td><td className="text-right font-mono">{t.sgst.toFixed(2)}</td></tr>
              </>
            )}
            <tr className="border-t-2 border-black"><td colSpan={4} className="pt-1 text-right font-bold">TOTAL</td><td className="pt-1 text-right font-mono font-bold">₹ {t.total.toFixed(2)}</td></tr>
          </tfoot>
        </table>


        <div className={`mt-4 ${isThermal ? "text-[9px]" : "flex items-end justify-between text-xs"}`}>
          {isThermal ? (
            <div className="text-center">
              <div>Status: <b>{inv.paid ? "PAID" : "UNPAID"}</b></div>
              <div className="mt-2 italic">Thank you · Shifa Clinic</div>
            </div>
          ) : (
            <>
              <div>
                <div>Status: <b>{inv.paid ? "PAID" : "UNPAID"}</b></div>
                <div className="mt-8">Patient Signature</div>
              </div>
              <div className="text-right">
                <div className="mb-8 italic text-gray-600">Thank you for choosing Shifa Clinic. Get well soon.</div>
                <div>Authorised Signatory</div>
              </div>
            </>
          )}
        </div>

        {!isThermal && inv.department === "lab" && (
          <div className="mt-3 rounded border border-black/20 bg-gray-50 px-3 py-2 text-[10px] text-gray-700">
            Diagnostic services provided by a clinical establishment - <b>Exempt from GST</b> under Notification 12/2017-CT(Rate).
          </div>
        )}

        {!isThermal && (
          <div className="mt-6 border-t pt-2 text-center text-[10px] text-gray-600">
            Shifa Clinic · Kalladi Building, Killirani, Karakurissi · +91 9207 510 555 / +91 9207 518 555 · shifaclinickillirani@gmail.com
          </div>
        )}
      </div>
    </div>
  );
}
