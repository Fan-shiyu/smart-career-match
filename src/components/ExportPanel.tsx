import { useState } from "react";
import { FileSpreadsheet, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaywallModal } from "@/components/PaywallModal";
import { useUsage } from "@/hooks/useUsage";
import { ExportPreset, Job } from "@/types/job";
import { ALL_COLUMNS, EXPORT_PRESETS } from "@/lib/columns";

const CATEGORY_COLORS: Record<string, string> = {
  "Identifiers": "FF4472C4",
  "Job Basics": "FF5B9BD5",
  "Location": "FF70AD47",
  "Company": "FFFFC000",
  "Compensation": "FFED7D31",
  "Language & Visa": "FF9B59B6",
  "Requirements": "FFE74C3C",
  "Skills": "FF1ABC9C",
  "Benefits": "FF2ECC71",
  "Matching": "FF3498DB",
  "Raw Text": "FF95A5A6",
};

interface ExportPanelProps {
  jobs: Job[];
}

export function ExportPanel({ jobs }: ExportPanelProps) {
  const [preset, setPreset] = useState<ExportPreset>("quick");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { canExport, trackEvent, limits } = useUsage();

  const handleExport = async () => {
    if (!canExport(preset)) {
      setPaywallOpen(true);
      return;
    }

    const columnKeys = EXPORT_PRESETS[preset] || EXPORT_PRESETS.quick;
    const columns = columnKeys
      .map((k) => ALL_COLUMNS.find((c) => c.key === k))
      .filter(Boolean) as typeof ALL_COLUMNS;

    await exportXlsx(columns, jobs, preset, limits.plan);
    await trackEvent("export");
  };

  const locked = !canExport(preset);
  const colCount = (EXPORT_PRESETS[preset] || []).length;

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={preset} onValueChange={(v) => setPreset(v as ExportPreset)}>
          <SelectTrigger className="h-8 text-xs w-[160px] bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quick">Quick Overview</SelectItem>
            <SelectItem value="detailed">Detailed {limits.plan === "free" && "🔒"}</SelectItem>
            <SelectItem value="full">Full + Raw Text {limits.plan === "free" && "🔒"}</SelectItem>
            <SelectItem value="visa">Visa Focus {limits.plan === "free" && "🔒"}</SelectItem>
            <SelectItem value="skill-gap">Skill Gap {limits.plan === "free" && "🔒"}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleExport} className="h-8 text-xs gap-1.5">
          {locked ? <Lock className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
          Excel ({colCount})
        </Button>
      </div>

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        feature="Full export presets"
        currentUsage="Free plan only includes Quick Overview export"
      />
    </>
  );
}

async function exportXlsx(columns: typeof ALL_COLUMNS, data: Job[], preset: string, plan: string) {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();

  // Sheet 1: Overview
  const wsOverview = createSheet(wb, "Overview", columns, data, plan);

  // For detailed/full, also add FullData sheet with all columns
  if (preset === "detailed" || preset === "full") {
    const allCols = ALL_COLUMNS;
    createSheet(wb, "FullData", allCols, data, plan);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, `job-intelligence-${preset}-${dateStr()}.xlsx`);
}

function createSheet(wb: any, name: string, columns: typeof ALL_COLUMNS, data: Job[], plan: string) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 2 }] });

  // Build category groups
  const categoryGroups: { category: string; startCol: number; endCol: number }[] = [];
  let currentCat = "";
  let startCol = 1;
  columns.forEach((col, idx) => {
    if (col.category !== currentCat) {
      if (currentCat) categoryGroups.push({ category: currentCat, startCol, endCol: idx });
      currentCat = col.category;
      startCol = idx + 1;
    }
  });
  if (currentCat) categoryGroups.push({ category: currentCat, startCol, endCol: columns.length });

  // Row 1: Merged category headers
  for (const group of categoryGroups) {
    const cell = ws.getCell(1, group.startCol);
    cell.value = group.category;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    const bgColor = CATEGORY_COLORS[group.category] || "FF666666";
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    if (group.startCol !== group.endCol) ws.mergeCells(1, group.startCol, 1, group.endCol);
  }

  // Row 2: Column names
  columns.forEach((col, idx) => {
    const cell = ws.getCell(2, idx + 1);
    cell.value = col.label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { vertical: "middle", wrapText: true };
    const bgColor = CATEGORY_COLORS[col.category] || "FF666666";
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightenArgb(bgColor) } };
    cell.border = { bottom: { style: "thin", color: { argb: "FF999999" } } };
  });

  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: columns.length } };

  // Data rows with clickable URLs
  data.forEach((job) => {
    const rowValues = columns.map((c) => c.getValue(job));
    const row = ws.addRow(rowValues);
    columns.forEach((col, idx) => {
      if ((col.key === "apply_url" || col.key === "job_url") && rowValues[idx]) {
        const cell = row.getCell(idx + 1);
        cell.value = { text: rowValues[idx], hyperlink: rowValues[idx] };
        cell.font = { color: { argb: "FF0563C1" }, underline: true };
      }
    });
  });

  // Auto-width
  columns.forEach((_, idx) => {
    const col = ws.getColumn(idx + 1);
    let maxLen = columns[idx].label.length;
    data.forEach((job) => {
      maxLen = Math.max(maxLen, Math.min(columns[idx].getValue(job).length, 40));
    });
    col.width = Math.min(maxLen + 2, 42);
  });

  if (plan === "free") {
    const r = ws.addRow(columns.map((_, i) => i === 0 ? "Generated by Job Intelligence — Upgrade for full export" : ""));
    r.font = { italic: true, color: { argb: "FF999999" } };
  }

  return ws;
}

function dateStr() { return new Date().toISOString().split("T")[0]; }

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function lightenArgb(argb: string): string {
  const r = parseInt(argb.slice(2, 4), 16);
  const g = parseInt(argb.slice(4, 6), 16);
  const b = parseInt(argb.slice(6, 8), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.6));
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.6));
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.6));
  return `FF${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
