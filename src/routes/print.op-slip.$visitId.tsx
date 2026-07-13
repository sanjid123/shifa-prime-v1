import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Printer } from "lucide-react";
import { visits, findPatient, doctors, departments } from "@/lib/mock/data";

export const Route = createFileRoute("/print/op-slip/$visitId")({
  ssr: false,
  component: PrintOpSlip,
});

function PrintOpSlip() {
  const { visitId } = Route.useParams();
  const v = visits.find((x) => x.id === visitId);

  useEffect(() => {
    if (!v) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [v]);

  if (!v) return <div className="p-6 text-sm">Visit not found.</div>;
  const p = findPatient(v.patientId);
  const doc = doctors.find((d) => d.id === v.doctorId);
  const dept = departments.find((d) => d.id === v.departmentId);

  return (
    <div className="min-h-screen bg-white p-4 text-black">
      <style>{`@page{size:A5;margin:8mm} @media print{.no-print{display:none}}`}</style>
      <div className="mx-auto w-[148mm] text-[12px]">
        <div className="border-b-2 border-black pb-2 text-center">
          <div className="text-lg font-bold">SHIFA CLINIC</div>
          <div className="text-[10px]">Outpatient Slip</div>
        </div>
        <div className="mt-3 flex justify-between text-[11px]">
          <div><b>Visit:</b> <span className="font-mono">{v.id}</span></div>
          <div><b>Date:</b> {new Date(v.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
        </div>
        <div className="mt-3 rounded border p-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-600">Patient</div>
          <div className="text-base font-semibold">{p?.name ?? "-"} <span className="font-mono text-[11px]">({p?.mrn ?? ""})</span></div>
          <div className="text-[11px]">{p?.age}{p?.gender} · 📱 {p?.phone}{p?.address ? ` · ${p.address}` : ""}</div>
          {p?.allergies?.length ? <div className="mt-1 text-[11px] font-semibold">⚠ Allergies: {p.allergies.join(", ")}</div> : null}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Box label="Department" value={dept?.name ?? "-"} />
          <Box label="Doctor" value={doc?.name ?? "-"} />
          <Box label="Visit Type" value={v.visitType.toUpperCase()} />
        </div>
        <div className="mt-3 flex items-center justify-between rounded border border-black bg-black/5 p-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider">Token</div>
            <div className="font-mono text-3xl font-bold">{v.token}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider">Consultation Fee</div>
            <div className="text-2xl font-bold">₹ {v.fee.toFixed(2)}</div>
            <div className="text-[10px]">{v.feePaid ? "PAID" : "UNPAID"}</div>
          </div>
        </div>
        <div className="mt-6 border-t pt-2 text-center text-[10px] text-gray-600">
          Please wait for your token to be called · Keep this slip for pharmacy & lab
        </div>
      </div>
      <div className="no-print mt-4 text-center">
        <button onClick={() => window.print()} className="inline-flex items-center rounded border px-3 py-1 text-xs">
          <Printer className="mr-1 h-3 w-3" />Print
        </button>
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-2">
      <div className="text-[9px] uppercase tracking-wider text-gray-600">{label}</div>
      <div className="truncate text-[12px] font-semibold">{value}</div>
    </div>
  );
}
