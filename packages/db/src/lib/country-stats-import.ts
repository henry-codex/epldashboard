/**
 * Parses the workbook's "All Stats" tab — one sheet with every country's
 * cohort-level planning numbers stacked in blocks (country name, a header
 * row, one row per cohort, a block total). This data has no per-fellow
 * source: attrition rates and "Total to be Recruited" are the program's own
 * planning figures, not something derivable from any individual roster row.
 *
 * A country manager uploads this same multi-country file from their own hub
 * page; we read only the block matching their hub's name and ignore the
 * rest, so the file works unedited no matter which hub imports it.
 */

import { parseCsvRecords } from "./csv.js";
import { parseRoman, slugify } from "./country-import-profiles.js";

export type StatsCohortRow = {
  label: string;
  cohortNumber: number | null;
  cohortYear: number;
  lifecycleStatus: "alumni" | "active" | "incoming";
  startedCount: number | null;
  graduatedCount: number | null;
  toBeRecruitedCount: number | null;
  maleCount: number | null;
  femaleCount: number | null;
  pwdCount: number | null;
  idpCount: number | null;
  scholarCount: number | null;
  attritionRatePercent: number | null;
  attritionMale: number | null;
  attritionFemale: number | null;
  attritionPwd: number | null;
  attritionIdp: number | null;
};

function parseCell(raw: string | undefined): string {
  return (raw ?? "").trim();
}

function parseNum(raw: string | undefined): number | null {
  const value = parseCell(raw).replace(/%/g, "");
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function parseCohortNumberAndStatus(
  label: string,
): { number: number | null; statusWord: string } | null {
  const match = label.match(/^(?:cohort|class)\s+([ivxlcdm]+|\d+)\s*\(([^)]*)\)/i);
  if (!match) return null;
  const raw = match[1]!.toLowerCase();
  const num = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : parseRoman(raw);
  return { number: num, statusWord: match[2]!.trim().toLowerCase() };
}

function toLifecycleStatus(statusWord: string): "alumni" | "active" | "incoming" | null {
  if (statusWord.startsWith("alumni")) return "alumni";
  if (statusWord.startsWith("fellow")) return "active";
  if (statusWord.startsWith("new recruit")) return "incoming";
  return null;
}

/** Which workbook tab a file came from. */
export type StatsSheetKind = "all" | "mcf";

/**
 * The two tabs are structurally identical — same country blocks, same
 * columns — but report different populations (MCF_Stats covers only the
 * Foundation-funded slice, so e.g. Ghana Cohort 8 is 45 in one and 44 in
 * the other). The title line is the only thing that tells them apart, so
 * each importer checks it rather than silently overwriting the other's
 * numbers.
 */
export function detectStatsSheetKind(csvText: string): StatsSheetKind {
  const head = parseCsvRecords(csvText)
    .slice(0, 12)
    .map((record) => record.join(" ").toLowerCase())
    .join(" ");
  return head.includes("mastercard foundation") ? "mcf" : "all";
}

/**
 * Extracts just the cohort rows belonging to `countryName`'s own block from
 * the full multi-country sheet — everything else in the file is ignored.
 */
export function parseCountryStatsSheet(
  csvText: string,
  countryName: string,
): { cohorts: StatsCohortRow[]; warnings: string[] } {
  const records = parseCsvRecords(csvText);
  const targetSlug = slugify(countryName);
  const warnings: string[] = [];
  const cohorts: StatsCohortRow[] = [];

  let currentSlug: string | null = null;
  let matchedBlock = false;

  for (const record of records) {
    const col0 = parseCell(record[0]);
    const col1 = parseCell(record[1]);
    const col2 = parseCell(record[2]);

    // Country header row: first cell holds the country name, nothing else
    // on the row yet (the "Male/Female/…" labels come on the next row).
    if (col0 && !/^\d{4}/.test(col0) && !col1 && !col2) {
      currentSlug = slugify(col0);
      if (currentSlug === targetSlug) matchedBlock = true;
      continue;
    }

    if (currentSlug !== targetSlug) continue;

    const parsed = parseCohortNumberAndStatus(col1);
    if (!parsed) continue; // header row, block total row, or blank separator

    const lifecycleStatus = toLifecycleStatus(parsed.statusWord);
    if (!lifecycleStatus) {
      warnings.push(`Unrecognized cohort status "${parsed.statusWord}" for "${col1}" — skipped`);
      continue;
    }

    const yearMatch = col0.match(/^(\d{4})/);
    if (!yearMatch) {
      warnings.push(`Could not read a year from "${col0}" for "${col1}" — skipped`);
      continue;
    }

    cohorts.push({
      label: col1.replace(/\(.*\)/, "").trim(),
      cohortNumber: parsed.number,
      cohortYear: Number.parseInt(yearMatch[1]!, 10),
      lifecycleStatus,
      startedCount: parseNum(record[4]),
      graduatedCount: parseNum(record[5]),
      toBeRecruitedCount: parseNum(record[6]),
      maleCount: parseNum(record[2]),
      femaleCount: parseNum(record[3]),
      pwdCount: parseNum(record[9]),
      idpCount: parseNum(record[10]),
      scholarCount: parseNum(record[11]),
      attritionRatePercent: parseNum(record[12]),
      attritionMale: parseNum(record[13]),
      attritionFemale: parseNum(record[14]),
      attritionPwd: parseNum(record[15]),
      attritionIdp: parseNum(record[16]),
    });
  }

  if (!matchedBlock) {
    warnings.push(
      `No block matching "${countryName}" was found in this file. Check that the sheet includes your hub's country name.`,
    );
  }

  return { cohorts, warnings };
}
