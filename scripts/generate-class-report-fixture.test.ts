import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildClassReportPdf } from "../src/lib/class-report-pdf";
import { projectClassReport } from "../src/lib/class-report-model";

const enabled = process.env.GENERATE_CLASS_REPORT_FIXTURE === "1";

describe.skipIf(!enabled)("class report fixture generator", () => {
  it("writes a fictional report for local visual verification", async () => {
    const generatedAt = "2026-08-27T12:00:00.000Z";
    const learners = Array.from({ length: 12 }, (_, index) => ({
      id: `learner-${index + 1}`,
      name: `${["Alex", "Beth", "Casey", "Drew", "Em", "Farah", "George", "Holly", "Isaac", "Jaya", "Kai", "Leah"][index]} Example`,
    }));
    const report = projectClassReport({
      className: "FICTIONAL SAMPLE - Level 2 Digital Group",
      courseTitle: "BTEC Digital Information Technology",
      units: ["Unit 4: Programming", "Unit 5: Data and information"],
      generatedAt,
      learners,
      comparisons: learners.flatMap((learner, index) => index % 3 === 0 ? [] : [{
        learnerId: learner.id,
        startingPercentage: 45 + index,
        latestPercentage: 58 + index,
        improvementPoints: 13,
        progressDate: "2026-08-21T09:00:00.000Z",
        evidence: { starting_sufficient: true, progress_sufficient: true },
      }]),
      mastery: learners.flatMap((learner, index) => [
        { learnerId: learner.id, currentPathway: index % 4 === 0 ? "Support" : "Core" },
        { learnerId: learner.id, currentPathway: index % 5 === 0 ? "Mastery" : "Stretch" },
      ]),
      allocations: [
        { id: "allocation-1", learnerId: null, activityId: "activity-1", releaseAt: "2026-08-01", deadlineAt: "2026-08-20", required: true },
        { id: "allocation-2", learnerId: null, activityId: "activity-2", releaseAt: "2026-08-10", deadlineAt: "2026-09-01", required: true },
      ],
      attempts: learners.slice(0, 8).map(learner => ({
        learnerId: learner.id, activityId: "activity-1", allocationId: "allocation-1", completedAt: "2026-08-18T10:00:00.000Z",
      })),
      misconceptions: [
        { learnerId: "learner-2", title: "Loop boundary", occurrenceCount: 2 },
        { learnerId: "learner-5", title: "Loop boundary", occurrenceCount: 1 },
        { learnerId: "learner-8", title: "Variable initialisation", occurrenceCount: 2 },
      ],
      actions: [
        { action: "Small-group reteach", reason: "Revisit loop tracing using a fresh worked example and independent check.", createdAt: "2026-08-25T09:00:00.000Z" },
        { action: "Review allocated practice", reason: "Check overdue required activity evidence at the next teaching session.", createdAt: "2026-08-24T09:00:00.000Z" },
      ],
    });
    const bytes = await buildClassReportPdf(report);
    const directory = path.join(process.cwd(), "output", "pdf");
    await mkdir(directory, { recursive: true });
    const output = path.join(directory, "sample-whole-class-evidence-report.pdf");
    await writeFile(output, bytes);
    expect(bytes.byteLength).toBeGreaterThan(3000);
  });
});
