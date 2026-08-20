import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  buildConciseLearnerReportPdf,
} from "@/lib/concise-learner-report-pdf";
import type { ReportEvidence } from "./[id]/route";

describe("individual learner PDF export", () => {
  it("generates a readable report even when evidence is missing", async () => {
    const evidence: ReportEvidence = {
      learnerName: "Example Learner",
      className: "Example Class",
      courseTitle: "Example Course",
      teacherName: "Example Teacher",
      enrolledAt: "2026-07-01",
      exportedAt: "2026-07-29T12:00:00Z",
      skills: [], comparisons: [], mastery: [], attempts: [], targets: [],
      feedback: [], misconceptions: [], teacherActions: [], snapshots: [],
      retrieval: [], badges: [], coins: [], assessments: [], overrides: [], curriculumAttempts: [],
    };
    const bytes = await buildConciseLearnerReportPdf(evidence);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getTitle()).toBe("Example Learner - Individual Learner Report");
    expect(pdf.getSubject()).toContain("feedback");
  });
});
