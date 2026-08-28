import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildClassUnitReportPdf } from "./class-unit-report-pdf";
import type { ClassUnitReport } from "./class-unit-report";

describe("class unit evidence PDF", () => {
  it("renders a factual empty-state report with document metadata", async () => {
    const report: ClassUnitReport = {
      className: "Group A", courseTitle: "BTEC IT",
      unitId: "40000000-0000-0000-0000-000000000004", unitCode: "4", unitTitle: "Programming",
      generatedAt: "2026-08-27T12:00:00.000Z", journey: null, topics: [], rows: [],
    };
    const bytes = await buildClassUnitReportPdf(report);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getTitle()).toBe("Group A - Unit 4 Evidence Report");
    expect(pdf.getSubject()).toContain("feedback");
  });
});
