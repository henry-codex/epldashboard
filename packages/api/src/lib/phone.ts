/**
 * Normalize phone numbers for Network import / create.
 * Country hubs often store local numbers (024…); we prefix the hub's
 * international calling code when the number isn't already international.
 */

/** ISO2 → calling code (digits only, no +). Focused on EPL / Africa hubs. */
const CALLING_CODE_BY_ISO2: Record<string, string> = {
  BJ: "229",
  BF: "226",
  BI: "257",
  CM: "237",
  CV: "238",
  CF: "236",
  TD: "235",
  KM: "269",
  CG: "242",
  CD: "243",
  CI: "225",
  DJ: "253",
  EG: "20",
  GQ: "240",
  ER: "291",
  SZ: "268",
  ET: "251",
  GA: "241",
  GM: "220",
  GH: "233",
  GN: "224",
  GW: "245",
  KE: "254",
  LS: "266",
  LR: "231",
  LY: "218",
  MG: "261",
  MW: "265",
  ML: "223",
  MR: "222",
  MU: "230",
  MA: "212",
  MZ: "258",
  NA: "264",
  NE: "227",
  NG: "234",
  RW: "250",
  ST: "239",
  SN: "221",
  SC: "248",
  SL: "232",
  SO: "252",
  ZA: "27",
  SS: "211",
  SD: "249",
  TZ: "255",
  TG: "228",
  TN: "216",
  UG: "256",
  ZM: "260",
  ZW: "263",
};

const ISO3_TO_ISO2: Record<string, string> = {
  BEN: "BJ",
  BFA: "BF",
  BDI: "BI",
  CMR: "CM",
  CPV: "CV",
  CAF: "CF",
  TCD: "TD",
  COM: "KM",
  COG: "CG",
  COD: "CD",
  CIV: "CI",
  DJI: "DJ",
  EGY: "EG",
  GNQ: "GQ",
  ERI: "ER",
  SWZ: "SZ",
  ETH: "ET",
  GAB: "GA",
  GMB: "GM",
  GHA: "GH",
  GIN: "GN",
  GNB: "GW",
  KEN: "KE",
  LSO: "LS",
  LBR: "LR",
  LBY: "LY",
  MDG: "MG",
  MWI: "MW",
  MLI: "ML",
  MRT: "MR",
  MUS: "MU",
  MAR: "MA",
  MOZ: "MZ",
  NAM: "NA",
  NER: "NE",
  NGA: "NG",
  RWA: "RW",
  STP: "ST",
  SEN: "SN",
  SYC: "SC",
  SLE: "SL",
  SOM: "SO",
  ZAF: "ZA",
  SSD: "SS",
  SDN: "SD",
  TZA: "TZ",
  TGO: "TG",
  TUN: "TN",
  UGA: "UG",
  ZMB: "ZM",
  ZWE: "ZW",
};

export function resolveCallingCode(input: {
  countryCode?: string | null;
  iso2?: string | null;
}): string | null {
  const iso2Raw = input.iso2?.trim().toUpperCase();
  if (iso2Raw && iso2Raw.length === 2 && CALLING_CODE_BY_ISO2[iso2Raw]) {
    return CALLING_CODE_BY_ISO2[iso2Raw]!;
  }

  const code = input.countryCode?.trim().toUpperCase();
  if (!code) return null;
  if (code.length === 2 && CALLING_CODE_BY_ISO2[code]) return CALLING_CODE_BY_ISO2[code]!;
  if (code.length === 3) {
    const iso2 = ISO3_TO_ISO2[code];
    if (iso2 && CALLING_CODE_BY_ISO2[iso2]) return CALLING_CODE_BY_ISO2[iso2]!;
  }
  return null;
}

/**
 * Prefer one primary number when sheets pack multiple with `/`.
 * If already international (+ or 00), keep it.
 * Otherwise prefix the hub calling code (and strip a leading trunk 0).
 */
export function normalizePhoneWithCountryCode(
  raw: string | null | undefined,
  callingCode: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;

  // Ghana etc. often store "024…/050…" — keep the first number only.
  const primary = raw.split(/[/|;]/)[0]?.trim() ?? raw.trim();
  let cleaned = primary.replace(/[\s().-]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : null;
  }

  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return null;

  if (!callingCode) return digits;

  // Already starts with country code without +
  if (digits.startsWith(callingCode) && digits.length > callingCode.length + 4) {
    return `+${digits}`;
  }

  // Local trunk prefix 0 → drop it (0248373240 → 248373240)
  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  if (!national) return null;

  return `+${callingCode}${national}`;
}
