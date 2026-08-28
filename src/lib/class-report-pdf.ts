import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ClassReport } from "./class-report-model";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const FOOTER_Y = 28;

export async function buildClassReportPdf(data: ClassReport) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 790;

  const footer = (target: PDFPage, pageNumber: number) => {
    target.drawLine({
      start: { x: MARGIN, y: 43 }, end: { x: PAGE_WIDTH - MARGIN, y: 43 },
      thickness: 0.6, color: rgb(0.75, 0.8, 0.82),
    });
    target.drawText("SCCB Digital Learning Hub - formative evidence only", {
      x: MARGIN, y: FOOTER_Y, size: 7.5, font: regular, color: rgb(0.35, 0.42, 0.45),
    });
    const pageText = `Page ${pageNumber}`;
    target.drawText(pageText, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageText, 7.5),
      y: FOOTER_Y, size: 7.5, font: regular, color: rgb(0.35, 0.42, 0.45),
    });
  };
  const newPage = () => {
    footer(page, pdf.getPageCount());
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawText(`${data.name} - Class Evidence Report`, {
      x: MARGIN, y: 808, size: 8, font: bold, color: rgb(0.35, 0.42, 0.45),
    });
    page.drawLine({
      start: { x: MARGIN, y: 799 }, end: { x: PAGE_WIDTH - MARGIN, y: 799 },
      thickness: 0.6, color: rgb(0.75, 0.8, 0.82),
    });
    y = 780;
  };
  const ensureSpace = (height: number) => {
    if (y < 55 + height) newPage();
  };
  const line = (text: string, size = 9.5, strong = false, indent = 0) => {
    const font = strong ? bold : regular;
    for (const part of wrapToWidth(text, font, size, PAGE_WIDTH - MARGIN * 2 - indent)) {
      if (y < 58) newPage();
      page.drawText(part, {
        x: MARGIN + indent, y, size, font,
        color: rgb(0.08, 0.14, 0.17),
      });
      y -= size + 5;
    }
  };
  const heading = (text: string) => {
    ensureSpace(52);
    y -= 7;
    line(text, 13.5, true);
    page.drawLine({
      start: { x: MARGIN, y: y + 8 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 8 },
      thickness: 1, color: rgb(0, 0.45, 0.43),
    });
    y -= 6;
  };
  const missingPercentage = (value: number | null) => value == null ? "not yet recorded" : `${value}%`;
  const signed = (value: number) => `${value >= 0 ? "+" : ""}${value}`;

  line("Class Evidence Report", 20, true);
  line("Starting point, verified progress, pathways and allocated learning", 10);
  y -= 3;
  line(`Class: ${data.name}`, 11, true);
  line(`Course: ${data.course}`);
  line(`Active selected units: ${data.units.length ? data.units.join(", ") : "None selected"}`);
  line(`Generated: ${new Date(data.generatedAt).toLocaleString("en-GB")}`, 8.5);

  heading("Learner evidence overview");
  if (data.rows.length) {
    data.rows.forEach(row => {
      ensureSpace(82);
      line(row.learner, 10.5, true);
      line(`Sufficient starting point: ${missingPercentage(row.starting)} | Verified latest progress: ${missingPercentage(row.latest)} | Comparable change: ${row.improvement == null ? "not yet calculable" : `${signed(row.improvement)} percentage points across ${row.comparableSkills} skill${row.comparableSkills === 1 ? "" : "s"}`}.`, 9, false, 8);
      line(`Recorded pathways: ${row.supportPathways} Support, ${row.masteryPathways} Mastery | Allocated activities: ${row.allocatedCompleted} of ${row.allocatedTotal} completed | Overdue required: ${row.overdueRequired}.`, 9, false, 8);
      y -= 3;
    });
  } else {
    line("No active learners are enrolled in this class.");
  }

  heading("Common recorded misconceptions");
  if (data.misconceptions.length) {
    data.misconceptions.slice(0, 12).forEach(item => line(
      `${item.title}: ${item.occurrenceCount} recorded occurrence${item.occurrenceCount === 1 ? "" : "s"} across ${item.learnerCount} learner${item.learnerCount === 1 ? "" : "s"}.`,
    ));
  } else {
    line("No selected-unit misconceptions are recorded for the active cohort.");
  }

  heading("Teacher actions and interventions");
  if (data.actions.length) {
    data.actions.forEach(action => {
      ensureSpace(55);
      line(`${new Date(action.createdAt).toLocaleDateString("en-GB")} - ${action.action}`, 10, true);
      line(action.reason, 9, false, 8);
    });
  } else {
    line("No active teacher actions are recorded for this class.");
  }

  ensureSpace(70);
  y -= 10;
  line("Accuracy and scope", 10, true);
  line("This report includes active learners and active selected units only. Starting points require sufficient stored evidence. Progress is shown only where a dated, comparable progress point exists. Missing evidence is labelled explicitly. Formal qualification assignments and grades are outside SCCB Digital Learning Hub.", 8);
  footer(page, pdf.getPageCount());

  const generatedAt = new Date(data.generatedAt);
  pdf.setTitle(`${data.name} - Class Evidence Report`);
  pdf.setSubject("Active cohort starting point, verified progress, pathways and allocated learning evidence");
  pdf.setAuthor("SCCB Digital Learning Hub");
  pdf.setCreator("SCCB Digital Learning Hub");
  if (!Number.isNaN(generatedAt.getTime())) pdf.setCreationDate(generatedAt);
  return pdf.save();
}

function wrapToWidth(text: string, font: PDFFont, size: number, width: number) {
  const words = text.replace(/[^\x20-\x7E]/g, "-").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
