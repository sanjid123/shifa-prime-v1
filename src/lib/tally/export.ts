import * as XLSX from "xlsx";
import { findPatient, invoiceTotal, type Invoice } from "@/lib/mock/data";
import { download } from "@/lib/reports/export";

const GSTIN = "32ABCDE1234F1Z5";
const COMPANY = "Shifa Clinic";
const SALES_LEDGER = "Sales - Pharmacy";

export type TallyVoucherType = "Sales" | "Credit Note";

function fmtDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function esc(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface TallyRow {
  date: string;
  voucherNo: string;
  party: string;
  taxable: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  total: number;
  gstin: string;
}

function toRows(invoices: Invoice[]): TallyRow[] {
  return invoices.map((inv) => {
    const t = invoiceTotal(inv);
    const p = findPatient(inv.patientId);
    return {
      date: inv.date,
      voucherNo: inv.id,
      party: p?.name ?? "Cash",
      taxable: t.taxable,
      gstRate: t.gstRate,
      cgst: t.cgst,
      sgst: t.sgst,
      total: t.total,
      gstin: GSTIN,
    };
  });
}

export function buildTallyXml(invoices: Invoice[], type: TallyVoucherType = "Sales"): string {
  const sign = type === "Credit Note" ? -1 : 1;
  const vouchers = invoices.map((inv) => {
    const t = invoiceTotal(inv);
    const p = findPatient(inv.patientId);
    const party = p?.name ?? "Cash";
    const date = fmtDate(inv.date);
    const cgstLedger = `Output CGST @ ${t.gstRate / 2}%`;
    const sgstLedger = `Output SGST @ ${t.gstRate / 2}%`;
    const partyAmt = (sign * t.total).toFixed(2);
    const salesAmt = (-sign * t.taxable).toFixed(2);
    const cgstAmt = (-sign * t.cgst).toFixed(2);
    const sgstAmt = (-sign * t.sgst).toFixed(2);

    const gstLedgers = t.gst > 0 ? `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${esc(cgstLedger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${sign > 0 ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${cgstAmt}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${esc(sgstLedger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${sign > 0 ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${sgstAmt}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>` : "";

    return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${type}" ACTION="Create" OBJVIEW="Accounting Voucher View">
        <DATE>${date}</DATE>
        <VOUCHERTYPENAME>${type}</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${esc(inv.id)}</VOUCHERNUMBER>
        <REFERENCE>${esc(inv.id)}</REFERENCE>
        <PARTYLEDGERNAME>${esc(party)}</PARTYLEDGERNAME>
        <PARTYNAME>${esc(party)}</PARTYNAME>
        <NARRATION>Pharmacy ${type} · ${esc(inv.id)}</NARRATION>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${esc(party)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${sign > 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
          <AMOUNT>${partyAmt}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${esc(SALES_LEDGER)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${sign > 0 ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
          <AMOUNT>${salesAmt}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>${gstLedgers}
      </VOUCHER>
    </TALLYMESSAGE>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${esc(COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>${vouchers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export function downloadTallyXml(invoices: Invoice[], type: TallyVoucherType, filename: string) {
  const xml = buildTallyXml(invoices, type);
  download(new Blob([xml], { type: "application/xml" }), `${filename}.xml`);
}

export function downloadTallyXlsx(invoices: Invoice[], filename: string) {
  const rows = toRows(invoices);
  const header = ["Date", "Voucher No", "Party", "GSTIN", "Taxable", "CGST%", "CGST", "SGST%", "SGST", "Total"];
  const matrix: (string | number)[][] = [header];
  rows.forEach((r) => matrix.push([
    new Date(r.date).toLocaleDateString("en-GB"),
    r.voucherNo, r.party, r.gstin,
    r.taxable.toFixed(2), r.gstRate / 2, r.cgst.toFixed(2), r.gstRate / 2, r.sgst.toFixed(2), r.total.toFixed(2),
  ]));
  const totals = rows.reduce((a, r) => ({ tax: a.tax + r.taxable, c: a.c + r.cgst, s: a.s + r.sgst, t: a.t + r.total }), { tax: 0, c: 0, s: 0, t: 0 });
  matrix.push(["", "", "TOTAL", "", totals.tax.toFixed(2), "", totals.c.toFixed(2), "", totals.s.toFixed(2), totals.t.toFixed(2)]);
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tally Day Book");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
}

export function downloadTallyCsv(invoices: Invoice[], filename: string) {
  const rows = toRows(invoices);
  const header = ["Date", "Voucher No", "Party", "GSTIN", "Taxable", "CGST%", "CGST", "SGST%", "SGST", "Total"];
  const lines = [header.join(",")];
  rows.forEach((r) => lines.push([
    new Date(r.date).toLocaleDateString("en-GB"),
    r.voucherNo, `"${r.party.replace(/"/g, '""')}"`, r.gstin,
    r.taxable.toFixed(2), r.gstRate / 2, r.cgst.toFixed(2), r.gstRate / 2, r.sgst.toFixed(2), r.total.toFixed(2),
  ].join(",")));
  download(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}
