import * as XLSX from "xlsx";

export type ReportColumn<T> = {
  key: keyof T | string;
  header: string;
  accessor?: (row: T) => string | number;
  align?: "left" | "right" | "center";
};

export function rowsToMatrix<T>(cols: ReportColumn<T>[], rows: T[]): (string | number)[][] {
  const head = cols.map((c) => c.header);
  const body = rows.map((r) =>
    cols.map((c) => (c.accessor ? c.accessor(r) : ((r as Record<string, unknown>)[c.key as string] ?? "")) as string | number),
  );
  return [head, ...body];
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv<T>(cols: ReportColumn<T>[], rows: T[], filename: string) {
  const matrix = rowsToMatrix(cols, rows);
  const csv = matrix
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export function exportXlsx<T>(cols: ReportColumn<T>[], rows: T[], filename: string, sheetName = "Report") {
  const matrix = rowsToMatrix(cols, rows);
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
}

export function printReport(title: string, subtitle: string, cols: { header: string; align?: string }[], rows: (string | number)[][]) {
  const w = window.open("", "_blank", "width=1000,height=700");
  if (!w) return;
  const html = `<!doctype html><html><head><title>${title}</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#111}
      h1{margin:0;font-size:20px}
      .sub{color:#555;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#f3f4f6;text-transform:uppercase;font-size:10px;letter-spacing:.06em}
      .head{border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:end}
      .brand{font-weight:800;letter-spacing:.08em}
      .meta{font-size:11px;color:#555;text-align:right}
      @media print{ button{display:none} }
    </style></head><body>
    <div class="head">
      <div>
        <div class="brand">SHIFA CLINIC</div>
        <h1>${title}</h1>
        <div class="sub">${subtitle}</div>
      </div>
      <div class="meta">Generated: ${new Date().toLocaleString()}<br/>Kalladi Building, Killirani, Karakurissi</div>
    </div>
    <table>
      <thead><tr>${cols.map((c) => `<th style="text-align:${c.align || "left"}">${c.header}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((r) => `<tr>${r.map((c, i) => `<td style="text-align:${cols[i]?.align || "left"}">${c}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
    <script>window.onload=()=>window.print()</script>
    </body></html>`;
  w.document.write(html);
  w.document.close();
}
