/**
 * RFC4180-style CSV parser/serializer.
 *
 * This is deliberately whole-document-aware (not line-by-line): a quoted
 * field is allowed to contain literal newlines (e.g. multi-line
 * "Qualification" cells exported from Google Sheets/Excel), which a naive
 * `text.split("\n")` parser mangles into broken rows.
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records = parseRecords(normalized);
  if (!records.length) return { headers: [], rows: [] };

  const headers = records[0]!;
  const rows = records
    .slice(1)
    .filter((record) => record.some((cell) => cell.trim().length > 0))
    .map((record) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = record[index] ?? "";
      });
      return row;
    });

  return { headers, rows };
}

/** Parses the full CSV text into rows of raw (already-unescaped) cell strings. */
export function parseCsvRecords(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return parseRecords(normalized);
}

function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      row.push(field.trim());
      field = "";
      records.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  // Flush the last field/row (files don't always end with a trailing newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    records.push(row);
  }

  return records;
}

function escapeCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function serializeCsv(headers: string[], rows: Record<string, string>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}
