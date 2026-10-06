import { expect, it } from "vitest";
import { findDuplicateGroups, mergeFellowFields, personKey, phoneKey } from "./duplicates";

it("normalizes names across case, accents, spacing and punctuation", () => {
  expect(personKey("  Kouamé ", "N'Guessan")).toBe(personKey("kouame", "n guessan"));
  expect(personKey("Tadala", "Khonje")).not.toBe(personKey("Tadala", "Banda"));
});

it("matches phone variants by their last nine digits", () => {
  expect(phoneKey("+225 0881 042 250")).toBe(phoneKey("0881042250"));
  expect(phoneKey("+265881042250")).toBe(phoneKey("881042250"));
  expect(phoneKey("12345")).toBeNull();
});

it("groups same name in the same cohort, or same phone, without repeating a group", () => {
  const groups = findDuplicateGroups([
    { id: "a", firstName: "Brian", lastName: "Banda", cohortYear: 2026, phone: "0994495421" },
    { id: "b", firstName: "brian", lastName: "BANDA", cohortYear: 2026, phone: "+265994495421" },
    { id: "c", firstName: "Brian", lastName: "Banda", cohortYear: 2025, phone: null },
    { id: "d", firstName: "Other", lastName: "Person", cohortYear: 2025, phone: "0881000000" },
    { id: "e", firstName: "Another", lastName: "Name", cohortYear: 2024, phone: "+225881000000" },
  ]);
  expect(groups).toEqual([
    { reason: "name", key: "brian banda|2026", ids: ["a", "b"] },
    { reason: "phone", key: "881000000", ids: ["d", "e"] },
  ]);
});

it("keeps the chosen record's values and fills its blanks from the other", () => {
  const merged = mergeFellowFields(
    { email: null, phone: "0881", nationality: "", gender: "Female", linkedinUrl: null, cohortYear: 2026, program: "PSF", externalId: null, isMcf: false, customFields: { qualification: "BSc", university: "" } },
    { email: "a@b.org", phone: "0999", nationality: "Malawian", gender: "Male", linkedinUrl: "x", cohortYear: 2025, program: "Other", externalId: "ext", isMcf: true, customFields: { university: "MUST", is_idp: true } },
  );
  expect(merged).toEqual({
    email: "a@b.org",
    phone: "0881",
    nationality: "Malawian",
    gender: "Female",
    linkedinUrl: "x",
    cohortYear: 2026,
    program: "PSF",
    externalId: "ext",
    isMcf: true,
    customFields: { university: "MUST", is_idp: true, qualification: "BSc" },
  });
});
