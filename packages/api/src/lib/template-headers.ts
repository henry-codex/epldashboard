/**
 * People often rebuild the Network template in Excel with readable headers
 * ("Full Name", "Cohort Year", "Placement"). This maps those onto the
 * template's own keys so such files import like the downloaded template.
 */

const TEMPLATE_ALIASES: Record<string, string> = {
  fullname: "fullName",
  firstname: "firstName",
  lastname: "lastName",
  status: "status",
  program: "program",
  programme: "program",
  cohortyear: "cohortYear",
  cohort: "cohortLabel",
  cohortlabel: "cohortLabel",
  gender: "gender",
  placement: "retentionInstitution",
  placementinstitution: "retentionInstitution",
  retentioninstitution: "retentionInstitution",
  roletitle: "roleTitle",
  role: "roleTitle",
  city: "city",
  region: "region",
  nationality: "nationality",
  ismcf: "isMcf",
  mcf: "isMcf",
  mcffunded: "isMcf",
  ismcffunded: "isMcf",
  ismcfscholar: "isMcfScholar",
  mcfscholar: "isMcfScholar",
  hasdisability: "hasDisability",
  disability: "hasDisability",
  disabilitystatus: "hasDisability",
  pwd: "hasDisability",
  isidp: "isIdp",
  idp: "isIdp",
  email: "email",
  emailaddress: "email",
  phone: "phone",
  phonenumber: "phone",
  linkedin: "linkedinUrl",
  linkedinurl: "linkedinUrl",
  qualification: "qualification",
  university: "university",
  externalid: "externalId",
};

const REQUIRED_TEMPLATE_KEYS = ["fullName", "status", "program", "cohortYear"];

function aliasKey(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Returns the headers/rows rekeyed to template keys, or null when the file
 * still wouldn't be a complete Network template. Unknown headers (e.g. a
 * hub's custom field keys) are kept as they are.
 */
export function aliasTemplateHeaders(
  headers: string[],
  rows: Record<string, string>[],
): { headers: string[]; rows: Record<string, string>[] } | null {
  const rename = new Map<string, string>();
  const taken = new Set<string>();
  for (const header of headers) {
    const target = TEMPLATE_ALIASES[aliasKey(header)];
    // First column wins if two headers mean the same field.
    if (target && !taken.has(target)) {
      rename.set(header, target);
      taken.add(target);
    }
  }
  const mapped = headers.map((header) => rename.get(header) ?? header);
  if (!REQUIRED_TEMPLATE_KEYS.every((key) => mapped.includes(key))) return null;

  return {
    headers: mapped,
    rows: rows.map((row) => {
      const next: Record<string, string> = {};
      for (const [header, value] of Object.entries(row)) next[rename.get(header) ?? header] = value;
      return next;
    }),
  };
}
