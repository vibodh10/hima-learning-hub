import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildClassReportPdf } from "./class-report-pdf";

describe("buildClassReportPdf", () => {
  it("creates a loadable evidence-labelled document", async () => {
    const bytes = await buildClassReportPdf({
      name: "Class A",
      course: "Digital",
      units: [],
      generatedAt: "2026-08-27T12:00:00.000Z",
      rows: [],
      misconceptions: [],
      actions: [],
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getTitle()).toBe("Class A - Class Evidence Report");
    expect(pdf.getSubject()).toContain("Active cohort");
  });
});
