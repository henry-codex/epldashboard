/**
 * Recognizes the raw per-country roster exports (the "Master Database EPL
 * Statistics" workbook's country tabs) by their column headers, and
 * transforms each into the platform's normalized fellow shape — so the
 * Import CSV feature can accept a country's own file exactly as they
 * export it, with no manual reshaping.
 *
 * Shared between the live `fellows.importCsv` endpoint (packages/api) and
 * the one-off `import-country-data.ts` migration script — both live
 * downstream of packages/db, so this is the right shared home.
 *
 * Design principle: never invent missing values (fake emails, guessed
 * role titles) to force a row into shape. Anything not confidently
 * derivable is left null; only rows missing a name or with a completely
 * unrecognized cohort/status are held back for manual review.
 */

export type FellowStatus = "incoming" | "active" | "alumni" | "inactive";

export type NormalizedFellow = {
  sourceRow: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  status: FellowStatus;
  cohortLabel: string | null;
  cohortYear: number | null;
  isMcf: boolean;
  hasDisability: boolean | null;
  isIdp: boolean | null;
  isMcfScholar: boolean | null;
  placementInstitution: string | null;
  /** Degree / field of study, where the country sheet records it. */
  qualification: string | null;
  /** Awarding university or college, where the country sheet records it. */
  university: string | null;
  externalId: string;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Generic parsing helpers
// ---------------------------------------------------------------------------

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const cleaned = fullName.replace(/\s+/g, " ").trim();
  const spaceIndex = cleaned.indexOf(" ");
  if (spaceIndex === -1) return { firstName: cleaned, lastName: cleaned };
  return {
    firstName: cleaned.slice(0, spaceIndex),
    lastName: cleaned.slice(spaceIndex + 1).trim(),
  };
}

export function parseYesNo(raw: string | undefined): boolean | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  if (value === "yes" || value === "y" || value === "true" || value === "1") return true;
  if (value === "no" || value === "n" || value === "false" || value === "0") return false;
  return null;
}

export function normalizeGender(raw: string | undefined): string | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith("f")) return "Female";
  if (value.startsWith("m")) return "Male";
  return raw!.trim();
}

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
  xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16,
};

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10,
};

export function parseRoman(raw: string | undefined): number | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  return ROMAN_NUMERALS[value] ?? null;
}

export function parseWordNumber(raw: string | undefined): number | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  return WORD_NUMBERS[value] ?? null;
}

/**
 * Some sheets (Malawi's "Placement" column) pack an institution name and a
 * location onto separate lines within one multi-line CSV cell — take just
 * the first non-blank line rather than treating the whole blob as one name.
 */
export function firstMeaningfulLine(raw: string | undefined): string | null {
  const line = raw
    ?.split("\n")
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  return line || null;
}

/**
 * Cohort reference tables, transcribed directly from the "All Stats" and
 * "MCF_Stats" tabs of the Master Database EPL Statistics workbook — real,
 * source-derived reference data (which cohort ran which year, and which
 * cohorts MCF funds), not invented. Maps a per-person cohort number/class
 * onto a year + lifecycle status:
 *   (Alumni) -> "alumni", (Fellows) -> "active", (New Recruits) -> "incoming"
 */
export const COHORT_TABLES: Record<string, Record<number, { year: number; status: FellowStatus; isMcf: boolean }>> = {
  ghana: {
    1: { year: 2018, status: "alumni", isMcf: false },
    2: { year: 2019, status: "alumni", isMcf: false },
    3: { year: 2021, status: "alumni", isMcf: false },
    4: { year: 2022, status: "alumni", isMcf: true },
    5: { year: 2023, status: "alumni", isMcf: true },
    6: { year: 2024, status: "alumni", isMcf: true },
    7: { year: 2025, status: "alumni", isMcf: true },
    8: { year: 2026, status: "active", isMcf: true },
  },
  liberia: {
    1: { year: 2009, status: "alumni", isMcf: false },
    2: { year: 2010, status: "alumni", isMcf: false },
    3: { year: 2011, status: "alumni", isMcf: false },
    4: { year: 2012, status: "alumni", isMcf: false },
    5: { year: 2013, status: "alumni", isMcf: false },
    6: { year: 2014, status: "alumni", isMcf: false },
    7: { year: 2017, status: "alumni", isMcf: false },
    8: { year: 2018, status: "alumni", isMcf: false },
    9: { year: 2020, status: "alumni", isMcf: false },
    10: { year: 2022, status: "alumni", isMcf: true },
    11: { year: 2023, status: "alumni", isMcf: true },
    12: { year: 2024, status: "alumni", isMcf: true },
    13: { year: 2025, status: "active", isMcf: true },
    14: { year: 2026, status: "incoming", isMcf: true },
  },
  "sierra-leone": {
    1: { year: 2025, status: "active", isMcf: true },
    2: { year: 2026, status: "incoming", isMcf: true },
  },
};

// Malawi's individual roster has no per-row cohort/class column — only a
// STATUS column (Alumni / Fellow / New Recruit). Mapped onto the one
// cohort-year the aggregate tables show for each bucket today. Breaks if
// Malawi ever runs two concurrent cohorts sharing the same status —
// flagged per-row as an assumption to confirm with the country team.
export const MALAWI_STATUS_TABLE: Record<string, { year: number; status: FellowStatus; isMcf: boolean }> = {
  alumni: { year: 2024, status: "alumni", isMcf: true },
  fellow: { year: 2025, status: "active", isMcf: true },
  fellows: { year: 2025, status: "active", isMcf: true },
  "new recruit": { year: 2026, status: "incoming", isMcf: true },
  "new recruits": { year: 2026, status: "incoming", isMcf: true },
};

// ---------------------------------------------------------------------------
// Per-country profiles
// ---------------------------------------------------------------------------

export type CountryImportProfile = {
  id: string;
  label: string;
  /** True when this profile recognizes the given CSV header row. */
  matches: (headers: string[]) => boolean;
  transform: (rows: Record<string, string>[]) => NormalizedFellow[];
};

function hasAll(headers: string[], required: string[]): boolean {
  return required.every((h) => headers.includes(h));
}

const ghanaProfile: CountryImportProfile = {
  id: "ghana",
  label: "Ghana",
  matches: (headers) => hasAll(headers, ["Fellow", "Cohort", "Placement Organisation"]),
  transform: (rows) =>
    rows.map((row, i) => {
      const warnings: string[] = [];
      const name = row["Fellow"]?.trim() ?? "";
      const { firstName, lastName } = splitName(name);
      const cohortNum = parseWordNumber(row["Cohort"]);
      const cohortInfo = cohortNum != null ? COHORT_TABLES.ghana![cohortNum] : undefined;
      if (cohortNum == null) warnings.push(`Unrecognized cohort value "${row["Cohort"]}"`);
      else if (!cohortInfo) warnings.push(`No reference data for Ghana cohort ${cohortNum}`);

      const email = row["Email"]?.trim().toLowerCase() || null;
      if (!email) warnings.push("No email on file");
      if (!row["Sex"]?.trim()) warnings.push("Gender not recorded in source sheet");

      return {
        sourceRow: i + 2,
        firstName,
        lastName,
        email,
        phone: row["Phone No."]?.trim() || null,
        gender: normalizeGender(row["Sex"]),
        status: cohortInfo?.status ?? "active",
        cohortLabel: cohortNum != null ? `Cohort ${cohortNum}` : row["Cohort"] || null,
        cohortYear: cohortInfo?.year ?? null,
        isMcf: cohortInfo?.isMcf ?? false,
        hasDisability: parseYesNo(row["PWD (Yes/No)"]),
        isIdp: parseYesNo(row["IDP (Yes/No)"]),
        isMcfScholar: parseYesNo(row["Mastercard Scholar (Yes/No)"]),
        placementInstitution: row["Placement Organisation"]?.trim() || null,
        qualification: null,
        university: null,
        externalId: `ghana:${slugify(`${cohortNum ?? "unk"}-${name}`)}`,
        warnings,
      };
    }),
};

const liberiaProfile: CountryImportProfile = {
  id: "liberia",
  label: "Liberia",
  matches: (headers) => hasAll(headers, ["NAME", "CLASS", "PLACEMENT"]),
  transform: (rows) =>
    rows.map((row, i) => {
      const warnings: string[] = [];
      const name = row["NAME"]?.trim() ?? "";
      const { firstName, lastName } = splitName(name);
      const classNum = parseRoman(row["CLASS"]);
      const cohortInfo = classNum != null ? COHORT_TABLES.liberia![classNum] : undefined;
      if (classNum == null) warnings.push(`Unrecognized class value "${row["CLASS"]}"`);
      else if (!cohortInfo) warnings.push(`No reference data for Liberia class ${classNum}`);

      const email = row["EMAIL"]?.trim().toLowerCase() || null;
      if (!email) warnings.push("No email on file");

      const gender = row["SEX"]?.trim();
      if (gender && gender !== "M" && gender !== "F") warnings.push(`Unexpected sex value "${gender}"`);

      return {
        sourceRow: i + 2,
        firstName,
        lastName,
        email,
        phone: null,
        gender: normalizeGender(gender),
        status: cohortInfo?.status ?? "active",
        cohortLabel: classNum != null ? `Class ${row["CLASS"]}` : row["CLASS"] || null,
        cohortYear: cohortInfo?.year ?? null,
        isMcf: cohortInfo?.isMcf ?? false,
        hasDisability: parseYesNo(row["PWD (Yes/No)"]),
        isIdp: parseYesNo(row["IDP (Yes/No)"]),
        isMcfScholar: parseYesNo(row["Mastercard Scholar (Yes/No)"]),
        placementInstitution: row["PLACEMENT"]?.trim() || null,
        // Liberia's sheet calls the field of study "DISCIPLINE".
        qualification: row["DISCIPLINE"]?.trim() || null,
        university: null,
        externalId: `liberia:${slugify(`${row["CLASS"] ?? "unk"}-${name}`)}`,
        warnings,
      };
    }),
};

const sierraLeoneProfile: CountryImportProfile = {
  id: "sierra-leone",
  label: "Sierra Leone",
  matches: (headers) => hasAll(headers, ["Full Name", "Cohort", "Host"]),
  transform: (rows) =>
    rows.map((row, i) => {
      const warnings: string[] = [];
      const name = row["Full Name"]?.trim() ?? "";
      const { firstName, lastName } = splitName(name);
      const cohortNum = parseWordNumber(row["Cohort"]);
      const cohortInfo = cohortNum != null ? COHORT_TABLES["sierra-leone"]![cohortNum] : undefined;
      if (cohortNum == null) warnings.push(`Unrecognized cohort value "${row["Cohort"]}"`);
      else if (!cohortInfo) warnings.push(`No reference data for Sierra Leone cohort ${cohortNum}`);

      const email = row["Email"]?.trim().toLowerCase() || null;
      if (!email) warnings.push("No email on file");

      return {
        sourceRow: i + 2,
        firstName,
        lastName,
        email,
        phone: row["Phone Number"]?.trim() || null,
        gender: normalizeGender(row["Gender/Sex"]),
        status: cohortInfo?.status ?? "active",
        cohortLabel: cohortNum != null ? `Cohort ${cohortNum}` : row["Cohort"] || null,
        cohortYear: cohortInfo?.year ?? null,
        isMcf: cohortInfo?.isMcf ?? false,
        hasDisability: parseYesNo(row["PWD"]),
        isIdp: parseYesNo(row["IDP"]),
        isMcfScholar: parseYesNo(row["Mastercard Scholars"]),
        placementInstitution: row["Host"]?.trim() || null,
        qualification: row["Qualification"]?.trim() || null,
        university: row["University/ College"]?.trim() || row["University/College"]?.trim() || null,
        externalId: `sierra-leone:${slugify(`${cohortNum ?? "unk"}-${name}`)}`,
        warnings,
      };
    }),
};

const malawiProfile: CountryImportProfile = {
  id: "malawi",
  label: "Malawi",
  matches: (headers) => hasAll(headers, ["STATUS", "NAME", "GENDER"]) && headers.includes("Placement"),
  transform: (rows) =>
    rows.map((row, i) => {
      const warnings: string[] = [];
      const name = row["NAME"]?.trim() ?? "";
      const { firstName, lastName } = splitName(name);
      const statusKey = row["STATUS"]?.trim().toLowerCase() ?? "";
      const info = MALAWI_STATUS_TABLE[statusKey];
      if (!info) warnings.push(`Unrecognized STATUS value "${row["STATUS"]}"`);
      else warnings.push("cohortYear inferred from STATUS bucket (no per-row cohort/class column in source) — confirm with country team");

      const email = row["EMAIL ADDRESS"]?.trim().toLowerCase() || null;
      if (!email) warnings.push("No email on file");

      return {
        sourceRow: i + 2,
        firstName,
        lastName,
        email,
        phone: row["PHONE"]?.trim() || null,
        gender: normalizeGender(row["GENDER"]),
        status: info?.status ?? "active",
        cohortLabel: row["STATUS"]?.trim() || null,
        cohortYear: info?.year ?? null,
        isMcf: info?.isMcf ?? true,
        hasDisability: parseYesNo(row["PWD (Yes/No)"]),
        isIdp: parseYesNo(row["IDP (Yes/No)"]),
        isMcfScholar: parseYesNo(row["MasterCard Scholar (Yes/No)"]),
        placementInstitution: firstMeaningfulLine(row["Placement"]),
        // Malawi packs degree / institution / date into one multi-line cell —
        // first line is the qualification, second (when present) the college.
        qualification: firstMeaningfulLine(row["QUALIFICATION"]),
        university: row["QUALIFICATION"]?.split("\n").map((s) => s.trim()).filter(Boolean)[1] ?? null,
        externalId: `malawi:${slugify(`${statusKey || "unk"}-${name}`)}`,
        warnings,
      };
    }),
};

export const COUNTRY_IMPORT_PROFILES: CountryImportProfile[] = [
  ghanaProfile,
  liberiaProfile,
  sierraLeoneProfile,
  malawiProfile,
];

export function detectCountryProfile(headers: string[]): CountryImportProfile | null {
  return COUNTRY_IMPORT_PROFILES.find((p) => p.matches(headers)) ?? null;
}

/** A row is held for manual review when it has no name, or no cohort/status could be resolved at all. */
export function isBlockingRow(fellow: NormalizedFellow): boolean {
  if (!fellow.firstName) return true;
  return fellow.warnings.some((w) => w.startsWith("Unrecognized") || w.startsWith("No reference data"));
}
