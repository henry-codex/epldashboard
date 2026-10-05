import { expect, it } from "vitest";
import { aliasTemplateHeaders } from "./template-headers";

it("maps readable template headers onto template keys", () => {
  const headers = ["Full Name", "Status", "Program", "Cohort Year", "Cohort", "Placement", "Is Mcf Scholar", "Disability Status", "isIdp", "Linkedin Url", "mentor"];
  const row = Object.fromEntries(headers.map((h) => [h, `v:${h}`]));
  const result = aliasTemplateHeaders(headers, [row]);
  expect(result?.headers).toEqual(["fullName", "status", "program", "cohortYear", "cohortLabel", "retentionInstitution", "isMcfScholar", "hasDisability", "isIdp", "linkedinUrl", "mentor"]);
  expect(result?.rows[0]).toMatchObject({ fullName: "v:Full Name", retentionInstitution: "v:Placement", hasDisability: "v:Disability Status", mentor: "v:mentor" });
});

it("returns null when required template columns are missing", () => {
  expect(aliasTemplateHeaders(["Full Name", "Status", "Program"], [])).toBeNull();
});

it("keeps the first of two headers that mean the same field", () => {
  const result = aliasTemplateHeaders(["Full Name", "Status", "Program", "Cohort Year", "Cohort", "Cohort Label"], []);
  expect(result?.headers).toEqual(["fullName", "status", "program", "cohortYear", "cohortLabel", "Cohort Label"]);
});
