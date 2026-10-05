// @vitest-environment node
// jsdom's File lacks text()/arrayBuffer(); Node's File matches the browser API.
import { Workbook } from "exceljs";
import { expect, it } from "vitest";
import { readImportFile } from "./import-file";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function xlsxFile(build: (workbook: Workbook) => void, name = "stats.xlsx") {
  const workbook = new Workbook();
  build(workbook);
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], name, { type: XLSX_TYPE });
}

it("passes CSV files through unchanged", async () => {
  const csv = "name,email\r\nAma,ama@example.com";
  await expect(readImportFile(new File([csv], "roster.csv", { type: "text/csv" }))).resolves.toBe(csv);
});

it("rejects legacy .xls files with a save-as hint", async () => {
  await expect(readImportFile(new File(["x"], "old.xls"))).rejects.toThrow(/save it as \.xlsx or CSV/);
});

it("converts the preferred sheet the way Excel's CSV export would", async () => {
  const file = await xlsxFile((workbook) => {
    workbook.addWorksheet("Notes").addRow(["ignore me"]);
    const sheet = workbook.addWorksheet("MCF_Stats");
    sheet.addRow(["Ghana"]);
    sheet.mergeCells("A1:D1");
    sheet.addRow(["2023 intake", "Cohort 5 (Alumni)", 13, { formula: "10+2", result: 12 }]);
    const rate = sheet.getCell("E2");
    rate.value = 0.04;
    rate.numFmt = "0%";
    sheet.addRow(['Note, with "quotes"', null, null, null, new Date(Date.UTC(2023, 8, 1))]);
  });

  const csv = await readImportFile(file, { preferredSheets: ["MCF Stats"] });
  expect(csv.split("\r\n")).toEqual([
    "Ghana,,,,",
    "2023 intake,Cohort 5 (Alumni),13,12,4%",
    '"Note, with ""quotes""",,,,2023-09-01',
  ]);
});

it("falls back to the first sheet when no preferred sheet exists", async () => {
  const file = await xlsxFile((workbook) => {
    workbook.addWorksheet("Roster").addRow(["name", "phone"]);
    workbook.addWorksheet("Other").addRow(["other"]);
  });
  await expect(readImportFile(file, { preferredSheets: ["All Stats"] })).resolves.toBe("name,phone");
});
