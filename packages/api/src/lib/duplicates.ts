/**
 * Duplicate detection for the Network roster. Email is already unique per
 * hub (database index), so the remaining signals are the same person under
 * a different/missing email: same name in the same cohort year, or the same
 * phone number. These only ever *suggest* duplicates — merging is a person's
 * decision, except the narrow import case in `matchByName`.
 */

/** Case-, accent- and spacing-insensitive name key ("Côte  Kouamé" → "cote kouame"). */
export function personKey(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Last nine digits of a phone number, so "+225 0881 042 250", "0881042250"
 * and "+265881042250" style variants of the same local number line up.
 * Too-short numbers return null rather than risk false matches.
 */
export function phoneKey(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : null;
}

export function nameCohortKey(firstName: string, lastName: string, cohortYear: number | null) {
  return `${personKey(firstName, lastName)}|${cohortYear ?? ""}`;
}

type Person = { id: string; firstName: string; lastName: string; cohortYear: number | null; phone: string | null };

export type DuplicateGroup = { reason: "name" | "phone"; key: string; ids: string[] };

/** Groups of two or more fellows that look like the same person. */
export function findDuplicateGroups(people: Person[]): DuplicateGroup[] {
  const byName = new Map<string, string[]>();
  const byPhone = new Map<string, string[]>();
  for (const person of people) {
    const name = nameCohortKey(person.firstName, person.lastName, person.cohortYear);
    byName.set(name, [...(byName.get(name) ?? []), person.id]);
    const phone = phoneKey(person.phone);
    if (phone) byPhone.set(phone, [...(byPhone.get(phone) ?? []), person.id]);
  }

  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();
  const add = (reason: DuplicateGroup["reason"], key: string, ids: string[]) => {
    const signature = [...ids].sort().join(",");
    if (ids.length < 2 || seen.has(signature)) return;
    seen.add(signature);
    groups.push({ reason, key, ids });
  };
  for (const [key, ids] of byName) add("name", key, ids);
  for (const [key, ids] of byPhone) add("phone", key, ids);
  return groups;
}

type MergeableFellow = {
  email: string | null;
  phone: string | null;
  nationality: string | null;
  gender: string | null;
  linkedinUrl: string | null;
  cohortYear: number | null;
  program: string | null;
  externalId: string | null;
  isMcf: boolean | null;
  customFields: unknown;
};

/** The kept record's values win; blanks are filled from the removed one. */
export function mergeFellowFields(keep: MergeableFellow, remove: MergeableFellow) {
  const pick = <T>(a: T | null, b: T | null) => (a == null || a === "" ? b : a);
  return {
    email: pick(keep.email, remove.email),
    phone: pick(keep.phone, remove.phone),
    nationality: pick(keep.nationality, remove.nationality),
    gender: pick(keep.gender, remove.gender),
    linkedinUrl: pick(keep.linkedinUrl, remove.linkedinUrl),
    cohortYear: pick(keep.cohortYear, remove.cohortYear),
    program: pick(keep.program, remove.program),
    externalId: pick(keep.externalId, remove.externalId),
    isMcf: Boolean(keep.isMcf) || Boolean(remove.isMcf),
    customFields: {
      ...((remove.customFields ?? {}) as Record<string, unknown>),
      ...Object.fromEntries(
        Object.entries((keep.customFields ?? {}) as Record<string, unknown>).filter(([, v]) => v !== null && v !== ""),
      ),
    },
  };
}
