/**
 * Legacy country-data migration script.
 *
 * Reads the raw "Master Database_EPL Statistics" per-country CSV exports
 * (Ghana / Liberia / Malawi / Sierra Leone "Data" tabs) and normalizes them
 * into the platform's `fellows` (+ `placements`) shape.
 *
 * Design principle (per product direction): the source sheets are messy
 * and each country used a different column layout. We do NOT invent
 * missing values (fake emails, guessed role titles, etc.) to force rows
 * into a rigid shape — the schema was loosened (nullable email, cohortYear,
 * placement roleTitle/city/startDate) specifically so real, partial data
 * can be stored as-is. Anything we can't confidently derive is left null
 * and/or flagged in the report for a human to resolve, never guessed.
 *
 * Usage (from packages/db):
 *   pnpm tsx src/scripts/import-country-data.ts                  # dry run, all countries
 *   pnpm tsx src/scripts/import-country-data.ts --dir ../../data # explicit source dir
 *   pnpm tsx src/scripts/import-country-data.ts --country ghana  # single country
 *   pnpm tsx src/scripts/import-country-data.ts --apply          # actually write to the DB
 *
 * Dry run (default) never touches the database — it only parses, normalizes,
 * and prints/saves a report so the numbers can be checked before anything
 * is written. Requires DATABASE_URL to be reachable only when --apply is
 * used (or when --apply is combined with tenant/program lookups).
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, serializeCsv } from "../lib/csv.js";
import {
  COUNTRY_IMPORT_PROFILES,
  isBlockingRow,
  type NormalizedFellow,
} from "../lib/country-import-profiles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

type Args = {
  dir: string;
  apply: boolean;
  exportCsv: boolean;
  country: string | null;
  outDir: string;
  tenantMap: Record<string, string>; // countrySlug -> tenantId (uuid), optional override
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dir: resolve(__dirname, "../../../../data"),
    apply: false,
    exportCsv: false,
    country: null,
    outDir: resolve(__dirname, "../../../../data/_import-report"),
    tenantMap: {},
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dir") args.dir = resolve(argv[++i]!);
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--export-csv") args.exportCsv = true;
    else if (arg === "--country") args.country = argv[++i]!.toLowerCase();
    else if (arg === "--out") args.outDir = resolve(argv[++i]!);
    else if (arg === "--tenant-map") {
      for (const pair of argv[++i]!.split(",")) {
        const [slug, id] = pair.split("=");
        if (slug && id) args.tenantMap[slug.trim().toLowerCase()] = id.trim();
      }
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type CountryResult = {
  country: string;
  tenantSlug: string;
  file: string;
  totalRows: number;
  ready: NormalizedFellow[];
  flagged: NormalizedFellow[]; // has warnings serious enough to hold for review
};

// ---------------------------------------------------------------------------
// Placement institution ("partner") grouping
// ---------------------------------------------------------------------------

// Same normalization the live app uses to match a fellow's service
// organization against a Partner record's name (packages/api/src/lib/
// partner-stats.ts) — kept identical so counts computed here line up with
// what the app recomputes later.
function normalizePartnerName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Only-safe canonicalization: expands the unambiguous "Min. of X" ->
 * "Ministry of X" abbreviation, and resolves a bare acronym ("GES") to a
 * fuller name seen elsewhere with that acronym in parentheses
 * ("Ghana Education Service (GES)"). Nothing beyond that is merged —
 * e.g. "Ghana Enterprises Agency" vs "Ghana Enterprises Agency (GEA)" vs
 * "GEA" collapse into one, but two genuinely different-looking names with
 * no shared acronym are left as separate institutions rather than guessed
 * into the same one.
 */
function canonicalizeInstitutionNames(rawNames: string[]): Map<string, string> {
  const acronymToFull = new Map<string, string>();
  for (const raw of rawNames) {
    const match = raw.match(/^(.+?)\s*\(([A-Z]{2,8})\)$/);
    if (match) acronymToFull.set(match[2]!, match[1]!.trim());
  }

  const rawToCanonical = new Map<string, string>();
  for (const raw of rawNames) {
    let name = raw.replace(/^min\.?\s+of\s+/i, "Ministry of ").trim();
    if (/^[A-Z]{2,8}$/.test(name) && acronymToFull.has(name)) {
      name = acronymToFull.get(name)!;
    }
    rawToCanonical.set(raw, name);
  }
  return rawToCanonical;
}

/** Distinct institutions currently hosting an ACTIVE fellow, with counts. */
function collectActivePartners(ready: NormalizedFellow[]): Map<string, { name: string; count: number }> {
  const activeInstitutions = ready
    .filter((f) => f.status === "active" && f.placementInstitution)
    .map((f) => f.placementInstitution!);

  const canonical = canonicalizeInstitutionNames([...new Set(activeInstitutions)]);
  const byKey = new Map<string, { name: string; count: number }>();
  for (const raw of activeInstitutions) {
    const name = canonical.get(raw)!;
    const key = normalizePartnerName(name);
    const entry = byKey.get(key);
    if (entry) entry.count += 1;
    else byKey.set(key, { name, count: 1 });
  }
  return byKey;
}

// ---------------------------------------------------------------------------
// Source files
// ---------------------------------------------------------------------------

// The row transforms themselves live in ../lib/country-import-profiles.ts,
// shared with the app's own Import CSV endpoint so both understand the
// exact same country formats.
const COUNTRIES = COUNTRY_IMPORT_PROFILES.map((profile) => ({
  slug: profile.id,
  label: profile.label,
  file: `Master Database_EPL Statisitcs_Aug2026 (2).xlsx - ${profile.label} Data.csv`,
  transform: profile.transform,
}));

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const targets = args.country ? COUNTRIES.filter((c) => c.slug === args.country) : COUNTRIES;
  if (!targets.length) {
    console.error(`No matching country for "${args.country}". Options: ${COUNTRIES.map((c) => c.slug).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const results: CountryResult[] = [];

  for (const country of targets) {
    const filePath = resolve(args.dir, country.file);
    if (!existsSync(filePath)) {
      console.warn(`⚠️  ${country.label}: file not found at ${filePath} — skipping`);
      continue;
    }
    const text = readFileSync(filePath, "utf-8");
    const { rows } = parseCsv(text);
    const normalized = country.transform(rows);
    const ready = normalized.filter((f) => !isBlockingRow(f));
    const flagged = normalized.filter(isBlockingRow);

    results.push({
      country: country.label,
      tenantSlug: country.slug,
      file: country.file,
      totalRows: rows.length,
      ready,
      flagged,
    });
  }

  // ---- Report -------------------------------------------------------
  console.log("\n=== Legacy country data — dry-run normalization report ===\n");
  for (const r of results) {
    const readyWithWarnings = r.ready.filter((f) => f.warnings.length > 0).length;
    const missingEmail = r.ready.filter((f) => !f.email).length;
    const activePartners = collectActivePartners(r.ready);
    console.log(`${r.country} (${r.tenantSlug})`);
    console.log(`  Source rows:        ${r.totalRows}`);
    console.log(`  Ready to import:    ${r.ready.length}  (${readyWithWarnings} with non-blocking warnings, ${missingEmail} missing email)`);
    console.log(`  Flagged for review: ${r.flagged.length}`);
    console.log(`  Placement institutions from ACTIVE fellows only: ${activePartners.size}`);
    for (const [, p] of [...activePartners.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5)) {
      console.log(`    ${p.name} — ${p.count} active fellow(s)`);
    }
    if (activePartners.size > 5) console.log(`    ...and ${activePartners.size - 5} more`);
    if (r.flagged.length) {
      const sample = r.flagged.slice(0, 5);
      for (const f of sample) {
        console.log(`    row ${f.sourceRow}: ${f.firstName} ${f.lastName} — ${f.warnings.join("; ")}`);
      }
      if (r.flagged.length > sample.length) console.log(`    ...and ${r.flagged.length - sample.length} more`);
    }
    console.log("");
  }

  mkdirSync(args.outDir, { recursive: true });
  for (const r of results) {
    const outFile = resolve(args.outDir, `${r.tenantSlug}.json`);
    writeFileSync(outFile, JSON.stringify(r, null, 2), "utf-8");
    console.log(`Wrote full report: ${outFile}`);
  }

  if (args.exportCsv) {
    // Best-effort: if the tenant + a single Program already exist in the
    // database, look up the real title so the CSV is ready to upload as-is
    // — no manual find/replace needed. Falls back to a placeholder only
    // when that lookup isn't possible (DB unreachable, or tenant/program
    // not set up yet), so this still works with no DB connection at all.
    const programByTenantSlug = new Map<string, string>();
    try {
      const { db, hubPrograms, tenants } = await import("../index.js");
      const { eq } = await import("drizzle-orm");
      for (const r of results) {
        const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, r.tenantSlug) });
        if (!tenant) continue;
        const programs = await db.query.hubPrograms.findMany({ where: eq(hubPrograms.tenantId, tenant.id) });
        if (programs.length === 1) programByTenantSlug.set(r.tenantSlug, programs[0]!.title);
      }
    } catch {
      // No reachable DB — every row just gets the placeholder below.
    }

    const csvOutDir = resolve(args.dir, "_ready-to-import");
    mkdirSync(csvOutDir, { recursive: true });
    const headers = [
      "firstName", "lastName", "email", "status", "cohortYear", "program",
      "phone", "gender", "hasDisability", "isMcf", "externalId", "institution",
    ];
    for (const r of results) {
      const program = programByTenantSlug.get(r.tenantSlug) ?? "SET_PROGRAM_NAME_HERE";
      const csvRows = r.ready.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email ?? "",
        status: p.status,
        cohortYear: p.cohortYear != null ? String(p.cohortYear) : "",
        program,
        phone: p.phone ?? "",
        gender: p.gender ?? "",
        hasDisability: p.hasDisability != null ? String(p.hasDisability) : "",
        isMcf: String(p.isMcf),
        externalId: p.externalId,
        institution: p.placementInstitution ?? "",
      }));
      const outFile = resolve(csvOutDir, `${r.tenantSlug}-ready-to-import.csv`);
      writeFileSync(outFile, serializeCsv(headers, csvRows), "utf-8");
      const programNote = program === "SET_PROGRAM_NAME_HERE" ? " — program name still needs filling in (no hub/program found yet)" : ` — program set to "${program}"`;
      console.log(`Wrote ready-to-upload CSV: ${outFile} (${csvRows.length} rows)${programNote}`);
    }
    console.log("\nUpload via Network > Import CSV in the app. Nothing has been written to the database.");
    return;
  }

  if (!args.apply) {
    console.log("\nDry run only — no database writes made. Re-run with --apply once the numbers above look right.");
    return;
  }

  // ---- Apply ----------------------------------------------------------
  // Imported lazily so a plain dry run never needs DATABASE_URL reachable.
  const { db, fellows, placements, hubPrograms, hubPartners, tenants } = await import("../index.js");
  const { and, eq } = await import("drizzle-orm");

  const summary = { created: 0, updated: 0, partnersCreated: 0, partnersUpdated: 0, unavailableSources: targets.length - results.length, skipped: results.reduce((count, result) => count + result.flagged.length, 0) };
  for (const r of results) {
    const tenantId =
      args.tenantMap[r.tenantSlug] ??
      (await db.query.tenants.findFirst({ where: eq(tenants.slug, r.tenantSlug) }))?.id;

    if (!tenantId) {
      summary.skipped += r.ready.length;
      console.error(`✗ ${r.country}: no tenant found for slug "${r.tenantSlug}". Create the country hub first (Settings > Countries) or pass --tenant-map ${r.tenantSlug}=<uuid>.`);
      continue;
    }

    const programs = await db.query.hubPrograms.findMany({ where: eq(hubPrograms.tenantId, tenantId) });
    if (programs.length !== 1) {
      summary.skipped += r.ready.length;
      console.error(
        `✗ ${r.country}: expected exactly one program configured for this hub to default onto, found ${programs.length}. Set up the program in Settings first, then re-run.`,
      );
      continue;
    }
    const program = programs[0]!.title;

    const institutionCanonical = canonicalizeInstitutionNames([
      ...new Set(r.ready.map((p) => p.placementInstitution).filter((v): v is string => !!v)),
    ]);

    let created = 0;
    let updated = 0;
    for (const person of r.ready) {
      const existing = await db.query.fellows.findFirst({
        where: and(eq(fellows.tenantId, tenantId), eq(fellows.externalId, person.externalId)),
      });

      const canonicalInstitution = person.placementInstitution
        ? institutionCanonical.get(person.placementInstitution) ?? person.placementInstitution
        : null;

      const customFields: Record<string, unknown> = { source_sheet: "legacy-country-data" };
      if (person.hasDisability != null) customFields.has_disability = person.hasDisability;
      if (person.isIdp != null) customFields.is_idp = person.isIdp;
      if (person.isMcfScholar != null) customFields.is_mcf_scholar = person.isMcfScholar;
      if (person.cohortLabel) customFields.source_cohort_label = person.cohortLabel;
      // Matched against hubPartners by name in packages/api/src/lib/partner-stats.ts —
      // keeping this in sync with the placements row below lets the app's own
      // "Partners" fellow-count sync agree with what this script computes.
      if (canonicalInstitution) customFields.service_organization = canonicalInstitution;

      const values = {
        tenantId,
        firstName: person.firstName,
        lastName: person.lastName || person.firstName,
        email: person.email,
        phone: person.phone,
        gender: person.gender,
        cohortYear: person.cohortYear,
        program,
        status: person.status,
        isMcf: person.isMcf,
        customFields,
        externalId: person.externalId,
        source: "sheets" as const,
        lastSyncedAt: new Date(),
      };

      let fellowId: string;
      if (existing) {
        await db.update(fellows).set({ ...values, updatedAt: new Date() }).where(eq(fellows.id, existing.id));
        fellowId = existing.id;
        updated += 1;
      } else {
        const [inserted] = await db.insert(fellows).values(values).returning();
        fellowId = inserted!.id;
        created += 1;
      }

      if (canonicalInstitution) {
        // "isCurrent" is what the app shows as "retained" — only knowable
        // for an active fellow. An alumnus's post-program retention is a
        // real unknown until confirmed, so null rather than a default "yes".
        const isRetentionKnown = person.status === "active" ? true : null;
        const existingPlacement = await db.query.placements.findFirst({
          where: and(eq(placements.tenantId, tenantId), eq(placements.fellowId, fellowId)),
        });
        if (existingPlacement) {
          await db
            .update(placements)
            .set({ institution: canonicalInstitution, isCurrent: isRetentionKnown })
            .where(eq(placements.id, existingPlacement.id));
        } else {
          await db.insert(placements).values({
            tenantId,
            fellowId,
            institution: canonicalInstitution,
            country: r.country,
            isCurrent: isRetentionKnown,
          });
        }
      }
    }

    // Placement institutions ("Partners" list), from ACTIVE fellows only —
    // alumni's old placements don't need a live institution record. Matches
    // against any partner a country admin already created by normalized
    // name, so this never creates a near-duplicate of an existing one.
    const activePartners = collectActivePartners(r.ready);
    const existingPartners = await db.query.hubPartners.findMany({
      where: and(eq(hubPartners.tenantId, tenantId), eq(hubPartners.kind, "placement")),
    });
    const existingByKey = new Map(existingPartners.map((p) => [normalizePartnerName(p.name), p]));

    let partnersCreated = 0;
    let partnersUpdated = 0;
    for (const [key, entry] of activePartners) {
      const existingPartner = existingByKey.get(key);
      if (existingPartner) {
        await db.update(hubPartners).set({ fellowCount: entry.count, updatedAt: new Date() }).where(eq(hubPartners.id, existingPartner.id));
        partnersUpdated += 1;
      } else {
        await db.insert(hubPartners).values({
          tenantId,
          name: entry.name,
          kind: "placement",
          status: "active",
          fellowCount: entry.count,
        });
        partnersCreated += 1;
      }
    }

    summary.created += created; summary.updated += updated;
    summary.partnersCreated += partnersCreated; summary.partnersUpdated += partnersUpdated;
    console.log(
      `✓ ${r.country}: ${created} fellows created, ${updated} updated, ${r.flagged.length} still flagged; ${partnersCreated} placement institutions created, ${partnersUpdated} fellow-counts updated.`,
    );
  }
  return summary;
}

async function runAudited() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.apply) return run();
  const argv = process.argv.slice(2), operator = argv[argv.indexOf("--operator") + 1];
  if (!argv.includes("--operator") || !operator || operator.startsWith("--")) throw new Error("--apply requires --operator ID");
  const { transactionalDb } = await import("../index");
  const { auditedTransaction, withAuditContext, requestAuditContext, writeAudit, auditFailure } = await import("../audit");
  return withAuditContext({ ...requestAuditContext({ source: "cli" }), actor: { kind: "operator", id: operator, name: null, role: null }, procedure: "system.import" }, async () => {
    try {
      return await auditedTransaction(transactionalDb, async (tx) => {
        const summary = await run();
        if (process.exitCode) throw new Error("Country import was rejected. Review the validation report.");
        await writeAudit(tx, { action: "system.import", category: "system", targetType: "country_data", outcome: summary?.skipped || summary?.unavailableSources ? "partial" : "success", details: summary ?? { count: 0 } });
      });
    } catch (error) {
      await auditFailure(transactionalDb, { action: "system.import", category: "system", targetType: "country_data", outcome: "failed", details: { reasonCode: "IMPORT_FAILED" } });
      throw error;
    }
  });
}
runAudited()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    // --apply and --export-csv both open a DB connection (postgres-js /
    // neon) that otherwise keeps the process alive indefinitely.
    process.exit(process.exitCode ?? 0);
  });
