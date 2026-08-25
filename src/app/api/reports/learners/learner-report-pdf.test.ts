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
      portfolioArtifacts: [{ unit_code: "4", topic_code: "A1", stage: "before", title: "Starting code", recorded_at: "2026-07-02T10:00:00Z" }],
      worksheets: [{ unit_code: "4", topic_code: "A1", evidence_stage: "before", responses: { mainTask: "Initial decomposition response." }, confidence: 2, submitted_at: "2026-07-02T10:00:00Z" }],
      catchUpRecords: [{ unit_code: "4", topic_code: "A2-A3", source: "attendance_integration", opened_teaching_week: 2, opened_at: "2026-07-09T10:00:00Z", completed_at: null }],
      recognitions: [{ title: "Progress noticed", message: "Your sustained improvement has been recognised.", recognised_at: "2026-07-20T10:00:00Z" }],
      attendanceEvents: [{ session_on: "2026-07-01", attendance_status: "present", provider_name: "Authorised MIS" }],
      certificateReviews: [{ status: "pending_review", eligible_at: "2026-07-28T10:00:00Z", achievement_levels: { title: "Gold" } }],
    };
    const bytes = await buildConciseLearnerReportPdf(evidence);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getTitle()).toBe("Example Learner - Individual Learner Report");
    expect(pdf.getSubject()).toContain("feedback");
  });
});
