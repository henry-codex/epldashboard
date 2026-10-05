import type { Cell, CellValue, Workbook, Worksheet } from "exceljs";

/**
 * Lets the CSV importers also take Excel workbooks. The file is turned into
 * the same CSV text Excel's "Save As CSV" would produce, so the server-side
 * parsers stay CSV-only and behave identically for both formats.
 */

export const IMPORT_FILE_ACCEPT =
  ".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ReadImportFileOptions = {
  /** Sheet names to prefer in a multi-sheet workbook, e.g. ["All Stats"]. Matched ignoring case, spaces and underscores. */
  preferredSheets?: string[];
};

export async function readImportFile(file: File, options: ReadImportFileOptions = {}): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls")) {
    throw new Error("Old .xls files aren't supported. In Excel, save it as .xlsx or CSV and import again.");
  }
  if (!name.endsWith(".xlsx") && file.type !== XLSX_TYPE) {
    return file.text();
  }

  // Loaded on demand so the Excel parser is not part of every page's bundle.
  // exceljs is CommonJS: depending on the bundler its classes arrive as named
  // exports or only under `default`.
  const excel: typeof import("exceljs") & { default?: typeof import("exceljs") } = await import("exceljs");
  const { Workbook } = excel.default ?? excel;
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error("Couldn't read this Excel file. Check it opens in Excel, or save it as CSV and import that.");
  }

  const sheet = pickSheet(workbook, options.preferredSheets ?? []);
  if (!sheet) throw new Error("This Excel file has no sheets to import.");
  return worksheetToCsv(sheet);
}

function sheetKey(name: string) {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}

export function pickSheet(workbook: Workbook, preferred: string[]): Worksheet | undefined {
  const visible = workbook.worksheets.filter((sheet) => sheet.state === "visible");
  for (const wanted of preferred) {
    const match = visible.find((sheet) => sheetKey(sheet.name) === sheetKey(wanted));
    if (match) return match;
  }
  return visible[0];
}

export function worksheetToCsv(sheet: Worksheet): string {
  const width = sheet.columnCount;
  const lines: string[] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= width; c++) cells.push(csvEscape(cellText(row.getCell(c))));
    lines.push(cells.join(","));
  }
  return lines.join("\r\n");
}

function csvEscape(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function cellText(cell: Cell): string {
  // Excel's CSV export writes a merged range's value once, in its top-left
  // cell; the stats parser relies on that to spot country header rows.
  if (cell.isMerged && cell.master !== cell) return "";
  return valueText(cell.value, cell.numFmt);
}

function valueText(value: CellValue, numFmt: string | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return numberText(value, numFmt);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("formula" in value || "sharedFormula" in value) return valueText((value.result ?? null) as CellValue, numFmt);
  if ("hyperlink" in value) return typeof value.text === "string" ? value.text : valueText(value.text as CellValue, numFmt);
  if ("error" in value) return "";
  return "";
}

function numberText(value: number, numFmt: string | undefined): string {
  // Percent cells store a fraction (4% is 0.04); importers expect "4%".
  if (numFmt?.includes("%")) {
    const decimals = numFmt.match(/0\.(0+)%/)?.[1]?.length ?? 0;
    return `${Number((value * 100).toFixed(decimals))}%`;
  }
  return String(value);
}
