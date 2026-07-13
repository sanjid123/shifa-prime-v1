import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { visits, findPatient, doctors, departments } from "@/lib/mock/data";

export const Route = createFileRoute("/print/token/$visitId")({
  ssr: false,
  component: PrintToken,
});

function PrintToken() {
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
    <div className="min-h-screen bg-white p-2 text-black">
      <style>{`@page{size:80mm auto;margin:3mm} @media print{.no-print{display:none}}`}</style>
      <div className="mx-auto w-[74mm] text-center text-[11px]">
        <div className="font-bold">SHIFA CLINIC</div>
        <div className="text-[9px]">Token Slip</div>
        <div className="my-2 border-t border-dashed" />
        <div className="text-[9px] uppercase tracking-wider text-gray-600">Token</div>
        <div className="font-mono text-[42px] font-black leading-none">{v.token}</div>
        <div className="my-2 border-t border-dashed" />
        <div className="text-[11px] font-semibold">{p?.name ?? "-"}</div>
        <div className="text-[9px] text-gray-700">{p?.mrn} · {p?.age}{p?.gender}</div>
        <div className="mt-1 text-[10px]">{dept?.name}</div>
        <div className="text-[10px] font-semibold">{doc?.name}</div>
        <div className="my-2 border-t border-dashed" />
        <div className="text-[9px] text-gray-600">
          {new Date(v.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
        </div>
        <div className="mt-1 font-mono text-[9px]">{v.id}</div>
      </div>
      <div className="no-print mt-3 text-center">
        <button onClick={() => window.print()} className="rounded border px-3 py-1 text-xs">Print</button>
      </div>
    </div>
  );
}
