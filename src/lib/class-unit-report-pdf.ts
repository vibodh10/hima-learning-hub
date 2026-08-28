import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ClassUnitReport } from "./class-unit-report";

export async function buildClassUnitReportPdf(report: ClassUnitReport) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;

  const addPage = () => {
    page = pdf.addPage([595, 842]);
    y = 790;
  };
  const ensureSpace = (height: number) => {
    if (y < height + 55) addPage();
  };
  const line = (text: string, size = 9, strong = false, indent = 0) => {
    for (const part of wrap(text, Math.max(45, 98 - indent * 7))) {
      if (y < 55) addPage();
      page.drawText(part, {
        x: 48 + indent * 12,
        y,
        size,
        font: strong ? bold : regular,
        color: rgb(0.08, 0.14, 0.17),
      });
      y -= size + 5;
    }
  };
  const heading = (text: string, followingSpace = 48) => {
    ensureSpace(followingSpace);
    y -= 7;
    line(text, 13, true);
  };

  line("Class Unit Evidence Report", 20, true);
  line("Stored learning, feedback, target and intervention evidence", 10);
  y -= 5;
  line(`Class: ${report.className}`, 11, true);
  line(`Course: ${report.courseTitle}`);
  line(`Unit ${report.unitCode}: ${report.unitTitle}`, 11, true);
  line(`Generated: ${new Date(report.generatedAt).toLocaleString("en-GB")}`);

  heading("Shared learning journey");
  if (report.journey) {
    line(`${report.journey.title} | ${report.journey.status}${report.journey.teachingWeek != null ? ` | Teaching Week ${report.journey.teachingWeek}${report.journey.totalTeachingWeeks ? ` of ${report.journey.totalTeachingWeeks}` : ""}` : ""} | Started ${date(report.journey.startedOn)}.`);
  } else {
    line("No shared learning journey is recorded for this class and unit.");
  }
  line(`Approved modules: ${report.topics.length ? report.topics.map((topic, index) => `${index + 1}. ${topic.code} ${topic.title}`).join("; ") : "No approved modules configured"}.`);

  heading("Cohort overview");
  if (!report.rows.length) line("No active learners are enrolled in this class.");
  report.rows.forEach(row => {
    ensureSpace(105);
    line(row.learnerName, 11, true);
    line(`Starting point: ${row.startingPoint} | Secure modules: ${row.modulesCompleted} of ${row.totalModules} | Unit progress: ${row.unitProgress == null ? "Not calculable" : `${row.unitProgress}%`}.`, 9, false, 1);
    line(`Current position: ${row.currentModule} | ${row.currentSection} | Latest assessment: ${row.latestAssessment} on ${date(row.latestAssessmentDate)}.`, 9, false, 1);
    line(`Attention: ${row.attention} | Next step: ${row.nextStep}.`, 9, false, 1);
  });

  heading("Learner evidence detail", 125);
  report.rows.forEach(row => {
    ensureSpace(190);
    line(row.learnerName, 12, true);
    line(`Starting point: ${row.startingPoint}.`);
    line(`Learning completed: ${row.modulesStarted} modules started; ${row.modulesCompleted} securely completed from ${row.totalModules} approved modules; current position ${row.currentModule}, ${row.currentSection}.`);
    line(`Assessment and improvement: ${row.latestAssessment} (${date(row.latestAssessmentDate)}); ${row.comparableProgress}.`);
    line(`Feedback and learner response: ${row.reviewedFeedback} reviewed feedback record${row.reviewedFeedback === 1 ? "" : "s"}; ${row.feedbackResponse}.`);
    line(`Targets: ${row.activeTargets} active, ${row.overdueTargets} overdue, ${row.achievedTargets} achieved.`);
    line(`Practical evidence: ${row.portfolioArtifacts} portfolio artefact${row.portfolioArtifacts === 1 ? "" : "s"}; ${row.worksheets} saved worksheet${row.worksheets === 1 ? "" : "s"}; ${row.outstandingCatchUp} outstanding catch-up item${row.outstandingCatchUp === 1 ? "" : "s"}.`);
    line(`Teacher support and intervention: ${row.teacherDecisions} recorded unit decision${row.teacherDecisions === 1 ? "" : "s"}.`);
    line(`Current evidence status: ${row.attention}.`);
    line(`Next step: ${row.nextStep}.`);
    y -= 5;
  });

  heading("Accuracy and scope");
  line("This report organises factual evidence already stored in SCCB Digital Learning Hub. Missing evidence is shown explicitly. Secure module completion requires the recorded mastery threshold and independent attempts; progress is only stated from sufficient comparable evidence.", 8);
  line("This educational evidence report supports professional review but does not guarantee Ofsted compliance or replace the centre's approved attendance, safeguarding, SEND, qualification-assessment or statutory records.", 8);

  addFooters(pdf.getPages(), regular, bold, report);
  pdf.setTitle(`${report.className} - Unit ${report.unitCode} Evidence Report`);
  pdf.setSubject("Unit-scoped starting point, learning, assessment, feedback, target, intervention and next-step evidence");
  pdf.setAuthor("SCCB Digital Learning Hub");
  pdf.setCreator("SCCB Digital Learning Hub");
  pdf.setCreationDate(new Date(report.generatedAt));
  return pdf.save();
}

function addFooters(pages: PDFPage[], regular: PDFFont, bold: PDFFont, report: ClassUnitReport) {
  pages.forEach((page, index) => {
    page.drawLine({ start: { x: 48, y: 36 }, end: { x: 547, y: 36 }, thickness: 0.5, color: rgb(0.75, 0.8, 0.82) });
    page.drawText(`Unit ${ascii(report.unitCode)} evidence | ${ascii(report.className)}`, { x: 48, y: 22, size: 7, font: bold, color: rgb(0.3, 0.36, 0.39) });
    page.drawText(`Page ${index + 1} of ${pages.length}`, { x: 497, y: 22, size: 7, font: regular, color: rgb(0.3, 0.36, 0.39) });
  });
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB") : "not yet recorded";
}

function ascii(value: string) {
  return value.replace(/[^\x20-\x7E]/g, "-");
}

function wrap(text: string, width: number) {
  const words = ascii(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((`${current} ${word}`).trim().length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (`${current} ${word}`).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}
