import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Printer, Download, X } from "lucide-react";
import { samples, findPatient } from "@/lib/mock/data";
import type { LabTest } from "@/lib/mock/data";
import logo from "@/assets/shifa-logo-v2.png";

export const Route = createFileRoute("/print/result/$sampleId")({
  ssr: false,
  component: PrintResult,
});

type Flag = "normal" | "high" | "low" | "critical" | "pending";
function flagOf(t: LabTest): { flag: Flag; label: string } {
  const v = t.value;
  if (v === undefined || v === null || Number.isNaN(v)) return { flag: "pending", label: "-" };
  if (t.critLow !== undefined && v <= t.critLow) return { flag: "critical", label: "CRITICAL LOW" };
  if (t.critHigh !== undefined && v >= t.critHigh) return { flag: "critical", label: "CRITICAL HIGH" };
  if (v < t.low) return { flag: "low", label: "LOW" };
  if (v > t.high) return { flag: "high", label: "HIGH" };
  return { flag: "normal", label: "Normal" };
}

function PrintResult() {
  const { sampleId } = Route.useParams();
  const svgRef = useRef<SVGSVGElement>(null);
  const sample = samples.find((s) => s.id === sampleId || s.barcode === sampleId);

  useEffect(() => {
    if (!sample || !svgRef.current) return;
    JsBarcode(svgRef.current, sample.barcode, {
      format: "CODE128", height: 40, fontSize: 11, margin: 0, displayValue: true,
    });
  }, [sample]);

  if (!sample) {
    return <div className="p-6 text-sm">Sample not found.</div>;
  }
  const p = findPatient(sample.patientId);
  const collected = new Date(sample.createdAt);
  const reported = sample.reportedAt ? new Date(sample.reportedAt) : new Date();
  const tech = sample.technicianName ?? "Lab Technician";
  const verifier = sample.verifiedBy ?? "Dr. Consultant Pathologist";

  return (
    <div className="min-h-screen bg-neutral-100 text-black">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      {/* Screen-only action bar */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
        <div className="text-sm text-neutral-600">
          Report · <span className="font-mono">{sample.barcode}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">
            <Download className="h-4 w-4" /> Save as PDF
          </button>
          <button onClick={() => window.close()} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>

      {/* Report sheet */}
      <div className="sheet mx-auto my-6 max-w-[794px] bg-white p-10 shadow-md">
        {/* Header */}
        <header className="flex items-start justify-between border-b-2 border-emerald-700 pb-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Shifa Clinic" className="h-14 w-14" />
            <div>
              <div className="text-xl font-black tracking-wide text-emerald-800">SHIFA CLINIC</div>
              <div className="text-[11px] text-neutral-600">Kalladi Building, Killirani, Karakurissi</div>
              <div className="text-[11px] text-neutral-600">Ph: +91 00000 00000 · lab@shifaclinic.in</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold uppercase tracking-wider text-neutral-700">Laboratory Report</div>
            <svg ref={svgRef} className="mt-1" />
          </div>
        </header>

        {/* Patient block */}
        <section className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[12px]">
          <Row label="Patient" value={p?.name ?? "Walk-in"} />
          <Row label="Report No." value={sample.id} />
          <Row label="MRN" value={p?.mrn ?? "-"} />
          <Row label="Sample ID" value={sample.barcode} mono />
          <Row label="Age / Gender" value={p ? `${p.age} yrs / ${p.gender}` : "-"} />
          <Row label="Sample Type" value={sample.patientType ?? "OP"} />
          <Row label="Phone" value={p?.phone ?? "-"} />
          <Row label="Priority" value={sample.stat ? "STAT" : "Routine"} />
          <Row label="Collected" value={collected.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} />
          <Row label="Reported" value={reported.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} />
        </section>

        {/* Results table */}
        <section className="mt-6">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-700">Test Results</div>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-y-2 border-neutral-800 bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-700">
                <th className="py-2 pr-2 text-left">Test</th>
                <th className="py-2 px-2 text-right">Result</th>
                <th className="py-2 px-2 text-left">Unit</th>
                <th className="py-2 px-2 text-left">Reference Range</th>
                <th className="py-2 pl-2 text-left">Flag</th>
              </tr>
            </thead>
            <tbody>
              {sample.tests.map((t) => {
                const { flag, label } = flagOf(t);
                const abnormal = flag === "high" || flag === "low";
                const critical = flag === "critical";
                return (
                  <tr key={t.code} className="border-b border-neutral-200 align-top">
                    <td className="py-2 pr-2">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[10px] font-mono text-neutral-500">{t.code}</div>
                    </td>
                    <td className={`py-2 px-2 text-right font-mono ${critical ? "font-bold text-red-700" : abnormal ? "font-bold" : ""}`}>
                      {t.value ?? "-"}
                    </td>
                    <td className="py-2 px-2 text-neutral-700">{t.unit}</td>
                    <td className="py-2 px-2 text-neutral-700">{t.low} – {t.high}</td>
                    <td className={`py-2 pl-2 text-[11px] font-semibold ${critical ? "text-red-700" : abnormal ? "text-amber-700" : "text-emerald-700"}`}>
                      {label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-2 text-[10px] italic text-neutral-500">
            Values outside the reference range are marked HIGH / LOW. CRITICAL values require immediate clinical correlation.
          </div>
        </section>

        {/* Signatures */}
        <section className="mt-10 grid grid-cols-2 gap-8 text-[11px]">
          <div className="border-t border-neutral-400 pt-1">
            <div className="font-semibold">{tech}</div>
            <div className="text-neutral-600">Lab Technician</div>
          </div>
          <div className="border-t border-neutral-400 pt-1 text-right">
            <div className="font-semibold">{verifier}</div>
            <div className="text-neutral-600">Verified &amp; Approved by</div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 border-t pt-2 text-center text-[10px] text-neutral-500">
          *** End of Report *** &nbsp;·&nbsp; This is a computer-generated report. Please correlate clinically.
          <div className="mt-1">SHIFA CLINIC · Laboratory Services · Healthcare service - GST exempt (Notification 12/2017-CT(Rate))</div>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <div className="w-28 shrink-0 text-neutral-500">{label}:</div>
      <div className={`flex-1 font-medium ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
