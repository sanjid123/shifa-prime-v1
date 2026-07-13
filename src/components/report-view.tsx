import { Download, FileSpreadsheet, Printer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { exportCsv, exportXlsx, printReport, type ReportColumn } from "@/lib/reports/export";

export function ReportView<T>({
  title,
  subtitle,
  columns,
  rows,
  filename,
  filters,
  footer,
}: {
  title: string;
  subtitle?: string;
  columns: ReportColumn<T>[];
  rows: T[];
  filename: string;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const printableRows = rows.map((r) =>
    columns.map((c) => (c.accessor ? c.accessor(r) : ((r as Record<string, unknown>)[c.key as string] ?? "")) as string | number),
  );

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
              <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[11px] uppercase text-muted-foreground">Choose format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportCsv(columns, rows, filename)}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportXlsx(columns, rows, filename)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (XLSX)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => printReport(title, subtitle ?? "", columns.map((c) => ({ header: c.header, align: c.align })), printableRows)}>
              <Printer className="mr-2 h-4 w-4" /> PDF / Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {filters && <div className="border-b p-3 bg-muted/30">{filters}</div>}
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.header} className={`px-3 py-2 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} className="p-6 text-center text-xs text-muted-foreground">No data for the selected filters.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-accent/30">
                {columns.map((c) => {
                  const v = c.accessor ? c.accessor(r) : ((r as Record<string, unknown>)[c.key as string] ?? "");
                  return (
                    <td key={c.header} className={`px-3 py-2 ${c.align === "right" ? "text-right font-mono" : c.align === "center" ? "text-center" : ""}`}>{v as React.ReactNode}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot className="border-t bg-muted/30 text-sm">{footer}</tfoot>}
        </table>
      </div>
    </section>
  );
}
