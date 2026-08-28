import { mkdir, writeFile } from "node:fs/promises";
import { describe, it } from "vitest";
import { buildClassUnitReportPdf } from "../src/lib/class-unit-report-pdf";
import type { ClassUnitReport, ClassUnitReportRow } from "../src/lib/class-unit-report";

describe("visual class unit report fixture", () => {
  it.runIf(process.env.GENERATE_UNIT_REPORT_FIXTURE === "1")("writes a representative class-unit evidence PDF", async () => {
    const row = (overrides: Partial<ClassUnitReportRow>): ClassUnitReportRow => ({
      learnerId: "learner", learnerName: "Sample Learner", startingPoint: "62.5% (8 diagnostic responses)",
      startingScore: 62.5, modulesStarted: 3, modulesCompleted: 2, totalModules: 8, unitProgress: 25,
      currentModule: "A4: Uses of software applications", currentSection: "practice",
      latestAssessment: "A4: Uses of software applications: 74%", latestAssessmentDate: "2026-11-18T11:00:00Z",
      comparableProgress: "+14.5 percentage points across 3 comparable skills", activeTargets: 1,
      overdueTargets: 0, achievedTargets: 2, reviewedFeedback: 2,
      feedbackResponse: "+18 percentage points across 2 follow-up cycles", portfolioArtifacts: 4,
      worksheets: 5, outstandingCatchUp: 0, teacherDecisions: 1,
      attention: "Progress evidenced — no current alert rule triggered",
      nextStep: "Complete the A4 mastery check independently", ...overrides,
    });
    const report: ClassUnitReport = {
      className: "Level 3 IT - Sample Group", courseTitle: "Pearson BTEC Level 3 National Information Technology",
      unitId: "40000000-0000-0000-0000-000000000004", unitCode: "4", unitTitle: "Programming",
      generatedAt: "2026-11-20T15:30:00Z",
      journey: { title: "Programming - 12 teaching weeks", status: "in progress", teachingWeek: 7, totalTeachingWeeks: 12, startedOn: "2026-09-14" },
      topics: [
        { id: "1", code: "A1", title: "Computational thinking skills" },
        { id: "2", code: "A2-A3", title: "Programming principles" },
        { id: "3", code: "A4", title: "Uses of software applications" },
        { id: "4", code: "A5-A6", title: "Programming paradigms and languages" },
        { id: "5", code: "B1", title: "Software design" },
        { id: "6", code: "B2", title: "Reviewing software designs" },
        { id: "7", code: "C1-C2", title: "Developing and testing a program" },
        { id: "8", code: "C3-C5", title: "Reviewing and optimising a program" },
      ],
      rows: [
        row({ learnerId: "1", learnerName: "Sample Learner A" }),
        row({ learnerId: "2", learnerName: "Sample Learner B", startingPoint: "Not yet recorded", startingScore: null, modulesStarted: 0, modulesCompleted: 0, unitProgress: 0, currentModule: "Not started", currentSection: "Not yet recorded", latestAssessment: "Not yet recorded", latestAssessmentDate: null, comparableProgress: "Not yet calculable - insufficient comparable evidence", activeTargets: 0, achievedTargets: 0, reviewedFeedback: 0, feedbackResponse: "No reviewed feedback cycle recorded", portfolioArtifacts: 0, worksheets: 0, teacherDecisions: 0, attention: "Starting point not yet established", nextStep: "Complete the unit starting-point assessment" }),
        row({ learnerId: "3", learnerName: "Sample Learner C", overdueTargets: 1, outstandingCatchUp: 1, attention: "Needs attention - 1 overdue target", nextStep: "Complete a fresh loop-tracing task without hints" }),
        row({ learnerId: "4", learnerName: "Sample Learner D", modulesStarted: 8, modulesCompleted: 8, unitProgress: 100, currentModule: "Unit learning sequence complete", currentSection: "Complete", attention: "Progress evidenced - no current alert rule triggered", nextStep: "Review assessment and project evidence before confirming the next unit" }),
      ],
    };
    const bytes = await buildClassUnitReportPdf(report);
    await mkdir("output/pdf", { recursive: true });
    await writeFile("output/pdf/sample-class-unit-evidence-report.pdf", bytes);
  });
});
