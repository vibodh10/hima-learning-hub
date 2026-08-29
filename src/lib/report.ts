export function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
export function evidenceCsv(
  attempts: { completed_at: string | null; title: string; percentage: number; pathway: string }[],
  targets: { created_at: string; target_text: string; status: string }[],
) {
  const rows: unknown[][] = [["Date", "Evidence type", "Item", "Result", "Status"]];
  attempts.forEach(a => rows.push([a.completed_at ?? "", "Practice", a.title, `${a.percentage}%`, a.pathway]));
  targets.forEach(t => rows.push([t.created_at, "Target", t.target_text, "", t.status]));
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}

export type InspectionReportTarget = {
  target_text: string;
  status: string;
  starts_on: string;
  target_date: string;
  review_on: string | null;
  reason: string;
  success_measure: string | null;
  current_progress: number | null;
  review_result: string | null;
  final_outcome: string | null;
  next_action: string | null;
  created_at: string;
  skills: { title: string }[] | null;
};

export function targetStatus(target: Pick<InspectionReportTarget, "status" | "target_date">, asAt: Date) {
  if (target.status === "achieved") return "Achieved";
  if (target.status === "partially_achieved") return "Partially achieved";
  if (target.status === "not_achieved") return "Not achieved";
  if (target.status === "replaced") return "Replaced";
  if (target.status === "archived") return "Archived";
  const deadline = new Date(`${target.target_date}T23:59:59`);
  return deadline < asAt ? "Overdue" : target.status === "proposed" ? "Proposed" : "In progress";
}

export function inspectionEvidenceCsv(input: {
  learnerName: string;
  className: string;
  courseTitle: string;
  generatedAt: string;
  comparisons: {
    skill: string;
    startingPercentage: number;
    startingQuestionCount: number;
    startingSufficient: boolean;
    latestPercentage: number | null;
    progressQuestionCount: number;
    progressSufficient: boolean;
    improvementPoints: number | null;
    status: string;
  }[];
  targets: InspectionReportTarget[];
  attempts: { completed_at: string | null; title: string; percentage: number; pathway: string }[];
}) {
  const asAt = new Date(input.generatedAt);
  const rows: unknown[][] = [
    ["Learner progress and target evidence report"],
    ["Learner", input.learnerName],
    ["Class", input.className],
    ["Course", input.courseTitle],
    ["Report generated", input.generatedAt],
    [],
    ["Starting point and progress achieved"],
    ["Skill", "Starting point", "Latest progress point", "Progress achieved", "Evidence status"],
  ];
  input.comparisons.forEach(item => rows.push([
    item.skill,
    item.startingSufficient
      ? `${item.startingPercentage}% (${item.startingQuestionCount} equivalent questions)`
      : item.startingQuestionCount
        ? `Insufficient evidence (${item.startingQuestionCount} question${item.startingQuestionCount === 1 ? "" : "s"}; recorded response ${item.startingPercentage}%)`
        : "Not yet assessed",
    item.progressSufficient && item.latestPercentage != null
      ? `${item.latestPercentage}% (${item.progressQuestionCount} equivalent questions)`
      : item.progressQuestionCount
        ? `Insufficient evidence (${item.progressQuestionCount} question${item.progressQuestionCount === 1 ? "" : "s"})`
        : "Not yet assessed",
    item.startingSufficient && item.progressSufficient && item.improvementPoints != null
      ? `${item.improvementPoints >= 0 ? "+" : ""}${item.improvementPoints} percentage points`
      : "Not yet calculable - insufficient comparable evidence",
    item.status,
  ]));
  rows.push([], ["Targets, outcomes and deadlines"], [
    "Target", "Related skill", "Status", "Starts", "Deadline", "Review date",
    "Success measure", "Current progress", "Reason/evidence", "Review/outcome", "Next action",
  ]);
  input.targets.forEach(target => rows.push([
    target.target_text,
    target.skills?.[0]?.title ?? "Not linked to one skill",
    targetStatus(target, asAt),
    target.starts_on,
    target.target_date,
    target.review_on ?? "Not scheduled",
    target.success_measure ?? "Not recorded",
    target.current_progress == null ? "Not recorded" : `${target.current_progress}%`,
    target.reason,
    target.final_outcome ?? target.review_result ?? "Awaiting review",
    target.next_action ?? "Not recorded",
  ]));
  rows.push([], ["Dated supporting practice"], ["Date", "Activity", "Result", "Pathway"]);
  input.attempts.forEach(attempt => rows.push([
    attempt.completed_at ?? "Date not recorded", attempt.title, `${attempt.percentage}%`, attempt.pathway,
  ]));
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}

export type LearnerJourneyCsvRow = {
  unit: string;
  topic: string;
  skill: string;
  evidenceType: string;
  startingPointResult: string;
  startingPointDate: string;
  progressPointResult: string;
  progressPointDate: string;
  supportOrHintsUsed: string;
  change: string;
  feedback: string;
  learnerAction: string;
  improvementAfterFeedback: string;
  target: string;
  deadline: string;
  reviewDate: string;
  status: string;
};

export function learnerJourneyCsv(input: {
  learnerName: string;
  className: string;
  courseTitle: string;
  generatedAt: string;
  evidenceRange?: string;
  rows: LearnerJourneyCsvRow[];
}) {
  const rows: unknown[][] = [
    ["Individual Learner Report"],
    ["Learner", input.learnerName],
    ["Class", input.className],
    ["Course", input.courseTitle],
    ["Report generated", input.generatedAt],
    ["Evidence period", input.evidenceRange ?? "All recorded evidence through report date"],
    [],
    [
      "Unit", "Topic", "Skill", "Evidence type", "Starting-point result",
      "Starting-point date", "Progress-point result", "Progress-point date",
      "Support or hints used", "Change", "Feedback", "Learner action",
      "Improvement after feedback", "Target", "Deadline", "Review date", "Status",
    ],
  ];
  input.rows.forEach(row => rows.push([
    row.unit, row.topic, row.skill, row.evidenceType, row.startingPointResult,
    row.startingPointDate, row.progressPointResult, row.progressPointDate,
    row.supportOrHintsUsed, row.change, row.feedback, row.learnerAction,
    row.improvementAfterFeedback, row.target, row.deadline, row.reviewDate, row.status,
  ]));
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
