import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { labOrders, findPatient, testCatalog, labPackages } from "@/lib/mock/data";

export const Route = createFileRoute("/print/label/$orderId")({
  ssr: false,
  component: PrintLabel,
});

function PrintLabel() {
  const { orderId } = Route.useParams();
  const order = labOrders.find((o) => o.id === orderId);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!order || !svgRef.current) return;
    JsBarcode(svgRef.current, order.barcode, { format: "CODE128", height: 45, fontSize: 12, margin: 4, displayValue: true });
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [order]);

  if (!order) {
    return <div className="p-6 text-sm">Order not found.</div>;
  }
  const p = order.patientId ? findPatient(order.patientId) : undefined;
  const name = p?.name ?? order.opPatient?.name ?? "Walk-in";
  const ident = p ? `${p.mrn} · ${p.age}${p.gender}` : (order.opPatient?.age ? `${order.opPatient.age}${order.opPatient.gender ?? ""}` : "OP");
  const phone = p?.phone ?? order.opPatient?.phone ?? "";
  const testNames = [
    ...order.pkgIds.map((id) => labPackages.find((x) => x.id === id)?.code).filter(Boolean),
    ...order.testCodes.map((c) => testCatalog.find((t) => t.code === c)?.code).filter(Boolean),
  ].join(", ");

  return (
    <div className="min-h-screen bg-white p-4 text-black">
      <style>{`@page{size:100mm 50mm;margin:2mm} @media print{.no-print{display:none}}`}</style>
      <div className="mx-auto w-[95mm] rounded border border-black/40 p-2 text-[11px] leading-tight">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold">SHIFA CLINIC · Lab</div>
          <div className="text-[10px]">{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</div>
        </div>
        <svg ref={svgRef} className="mx-auto block" />
        <div className="mt-1 text-center font-mono text-[10px]">{order.id}</div>
        <div className="mt-1 font-semibold">{name}</div>
        <div className="text-[10px]">{ident} · {phone}</div>
        <div className="mt-1 text-[10px]"><b>Tests:</b> {testNames || "-"}</div>
      </div>
      <div className="no-print mt-4 text-center text-xs text-muted-foreground">
        <button onClick={() => window.print()} className="rounded border px-3 py-1">Print</button>
      </div>
    </div>
  );
}
