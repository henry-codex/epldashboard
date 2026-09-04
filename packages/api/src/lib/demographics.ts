type BreakdownItem = { name: string; count: number };

export function normalizeGender(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Not specified";
  const value = raw.trim().toLowerCase();
  if (value.startsWith("f")) return "Female";
  if (value.startsWith("m")) return "Male";
  if (value.includes("non-binary") || value.includes("nonbinary") || value === "other") return "Other";
  return raw.trim();
}

export function parseDisabilityValue(customFields: Record<string, unknown>): string {
  const keys = ["has_disability", "disability", "pwd", "person_with_disability"];
  for (const key of keys) {
    const raw = customFields[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const value = String(raw).trim().toLowerCase();
    if (value === "true" || value === "yes" || value === "1" || value.includes("with disability")) return "Yes";
    if (value === "false" || value === "no" || value === "0" || value.includes("no disability")) return "No";
    return String(raw).trim();
  }
  return "Not specified";
}

export function countBreakdown(values: string[]): BreakdownItem[] {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatStatusLabel(status: string): string {
  if (status === "active") return "Active Fellows";
  if (status === "alumni") return "Alumni";
  if (status === "inactive") return "Inactive";
  if (status === "incoming") return "Incoming (not yet started)";
  return status;
}
