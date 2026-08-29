import { evidenceCounts, hasValidComparableProgress, reportTargetStatus } from "./learner-report-model";
import { csvCell } from "./report";
import { plainDisplayText } from "./plain-display-text";

export type ClassUnitReportInput = {
  className: string;
  courseTitle: string;
  unitId: string;
  unitCode: string;
  unitTitle: string;
  generatedAt: string;
  journey: {
    title: string;
    status: string;
    teachingWeek: number | null;
    totalTeachingWeeks: number | null;
    startedOn: string | null;
  } | null;
  learners: { id: string; name: string }[];
  topics: { id: string; code: string; title: string }[];
  progress: UnitProgressEvidence[];
  attempts: UnitAttemptEvidence[];
  comparisons: UnitComparisonEvidence[];
  targets: UnitTargetEvidence[];
  decisions: UnitDecisionEvidence[];
  artifacts: { learnerId: string }[];
  worksheets: { learnerId: string }[];
  catchUp: { learnerId: string; topicCode: string; completedAt: string | null }[];
};

export type UnitProgressEvidence = {
  learnerId: string;
  topicCode: string;
  topicStartedAt: string | null;
  lessonCompletedAt: string | null;
  currentSection: string | null;
  practiceScore: number | null;
  masteryScore: number | null;
  independentAttempts: number;
  masteredAt: string | null;
  evidence: unknown;
  updatedAt: string;
};

export type UnitAttemptEvidence = {
  id: string;
  learnerId: string;
  kind: string;
  topicCode: string | null;
  paperMode: string | null;
  percentage: number;
  hintsUsed: number;
  completedAt: string;
  teacherFeedback: string | null;
};

export type UnitComparisonEvidence = {
  learnerId: string;
  startingPercentage: number;
  latestPercentage: number | null;
  improvementPoints: number | null;
  evidence: unknown;
  progressDate: string | null;
};

export type UnitTargetEvidence = {
  learnerId: string;
  status: string;
  targetText: string;
  targetDate: string;
  nextAction: string | null;
};

export type UnitDecisionEvidence = {
  learnerId: string;
  topicCode: string | null;
  decisionType: string;
  reason: string;
  reviewOn: string | null;
  createdAt: string;
};

export type ClassUnitReportRow = {
  learnerId: string;
  learnerName: string;
  startingPoint: string;
  startingScore: number | null;
  modulesStarted: number;
  modulesCompleted: number;
  totalModules: number;
  unitProgress: number | null;
  currentModule: string;
  currentSection: string;
  latestAssessment: string;
  latestAssessmentDate: string | null;
  comparableProgress: string;
  activeTargets: number;
  overdueTargets: number;
  achievedTargets: number;
  reviewedFeedback: number;
  feedbackResponse: string;
  portfolioArtifacts: number;
  worksheets: number;
  outstandingCatchUp: number;
  teacherDecisions: number;
  attention: string;
  nextStep: string;
};

export type ClassUnitReport = Omit<ClassUnitReportInput,
  "learners" | "progress" | "attempts" | "comparisons" | "targets" | "decisions" | "artifacts" | "worksheets" | "catchUp"
> & { rows: ClassUnitReportRow[] };

export function projectClassUnitReport(input: ClassUnitReportInput): ClassUnitReport {
  const asAt = new Date(input.generatedAt);
  const topicNames = new Map(input.topics.map(topic => [topic.code, topic.title]));
  const rows = input.learners.map(learner => {
    const progress = input.progress.filter(row => row.learnerId === learner.id);
    const attempts = input.attempts.filter(row => row.learnerId === learner.id)
      .sort((left, right) => Date.parse(left.completedAt) - Date.parse(right.completedAt));
    const comparisons = input.comparisons.filter(row => row.learnerId === learner.id);
    const targets = input.targets.filter(row => row.learnerId === learner.id);
    const decisions = input.decisions.filter(row => row.learnerId === learner.id);
    const diagnostics = progress.flatMap(row => evidenceItems(row.evidence))
      .filter(item => item.kind === "initial_diagnostic" && item.independent === true);
    const secureStarting = comparisons.filter(row => evidenceCounts(row.evidence).startingSufficient);
    const startingScore = secureStarting.length
      ? average(secureStarting.map(row => row.startingPercentage))
      : diagnostics.length >= 3
        ? average(diagnostics.map(item => item.correct === true ? 100 : 0))
        : null;
    const startingPoint = secureStarting.length
      ? `${startingScore}% (${secureStarting.length} assessed skill${secureStarting.length === 1 ? "" : "s"})`
      : diagnostics.length >= 3
        ? `${startingScore}% (${diagnostics.length} diagnostic responses)`
        : diagnostics.length
          ? `Insufficient evidence (${diagnostics.length} diagnostic response${diagnostics.length === 1 ? "" : "s"})`
          : "Not yet recorded";

    const completedCodes = new Set(progress.filter(isSecureModule).map(row => row.topicCode));
    const startedCodes = new Set(progress.filter(row => isStartedModule(row) ||
      attempts.some(attempt => attempt.topicCode === row.topicCode)).map(row => row.topicCode));
    attempts.filter(attempt => attempt.topicCode).forEach(attempt => startedCodes.add(attempt.topicCode!));
    const modulesCompleted = input.topics.filter(topic => completedCodes.has(topic.code)).length;
    const modulesStarted = input.topics.filter(topic => startedCodes.has(topic.code)).length;
    const unitProgress = input.topics.length
      ? Math.round(modulesCompleted / input.topics.length * 100)
      : null;
    const current = [...progress].filter(row => !isSecureModule(row) && isStartedModule(row))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
    const currentModule = input.topics.length === 0
      ? "No approved modules configured"
      : modulesCompleted === input.topics.length
        ? "Unit learning sequence complete"
        : current
          ? `${current.topicCode}: ${topicNames.get(current.topicCode) ?? "Module title not recorded"}`
          : "Not started";
    const currentSection = current?.currentSection?.replaceAll("_", " ") ??
      (modulesCompleted === input.topics.length && input.topics.length ? "Complete" : "Not yet recorded");

    const latestAttempt = attempts.at(-1);
    const latestAssessment = latestAttempt
      ? `${attemptLabel(latestAttempt, topicNames)}: ${round(latestAttempt.percentage)}%${latestAttempt.hintsUsed ? ` with ${latestAttempt.hintsUsed} hint${latestAttempt.hintsUsed === 1 ? "" : "s"}` : ""}`
      : "Not yet recorded";
    const validComparisons = comparisons.filter(row => hasValidComparableProgress({
      latestPercentage: row.latestPercentage,
      improvementPoints: row.improvementPoints,
      evidence: row.evidence,
      progressDate: row.progressDate,
    }));
    const averageChange = validComparisons.length
      ? average(validComparisons.map(row => Number(row.improvementPoints)))
      : null;
    const comparableProgress = validComparisons.length
      ? `${signed(averageChange!)} percentage points across ${validComparisons.length} comparable skill${validComparisons.length === 1 ? "" : "s"}`
      : "Not yet calculable - insufficient comparable evidence";

    const targetLabels = targets.map(target => ({ target, label: reportTargetStatus(target.status, target.targetDate, asAt) }));
    const overdueTargets = targetLabels.filter(item => item.label === "Overdue");
    const activeTargets = targetLabels.filter(item => item.label === "Active" || item.label === "Proposed");
    const achievedTargets = targetLabels.filter(item => item.label === "Achieved");
    const feedbackAttempts = attempts.filter(attempt => Boolean(attempt.teacherFeedback?.trim()));
    const feedbackImprovements = feedbackAttempts.flatMap(attempt => {
      const followUp = attempts.find(candidate => Date.parse(candidate.completedAt) > Date.parse(attempt.completedAt) &&
        attemptKey(candidate) === attemptKey(attempt));
      return followUp ? [followUp.percentage - attempt.percentage] : [];
    });
    const feedbackResponse = !feedbackAttempts.length
      ? "No reviewed feedback cycle recorded"
      : !feedbackImprovements.length
        ? "Follow-up evidence not yet recorded"
        : `${signed(average(feedbackImprovements)!)} percentage points across ${feedbackImprovements.length} follow-up cycle${feedbackImprovements.length === 1 ? "" : "s"}`;
    const catchUp = input.catchUp.filter(row => row.learnerId === learner.id && !row.completedAt);
    const repeatedDifficultyCode = repeatedDifficulty(attempts);
    const attention = overdueTargets.length
      ? `Needs attention - ${overdueTargets.length} overdue target${overdueTargets.length === 1 ? "" : "s"}`
      : catchUp.length
        ? `Needs attention - ${catchUp.length} outstanding catch-up item${catchUp.length === 1 ? "" : "s"}`
        : repeatedDifficultyCode
          ? `Needs attention - repeated difficulty in ${topicNames.get(repeatedDifficultyCode) ?? repeatedDifficultyCode}`
          : averageChange != null && averageChange < 0
            ? `Needs review - comparable progress changed by ${signed(averageChange)} points`
            : startingScore == null
              ? "Starting point not yet established"
              : modulesStarted === 0
                ? "No unit learning recorded"
                : modulesCompleted > 0 || Number(averageChange) > 0
                  ? "Progress evidenced - no current alert rule triggered"
                  : "Learning in progress - no current alert rule triggered";
    const priorityTarget = overdueTargets[0]?.target ?? activeTargets[0]?.target;
    const nextStep = priorityTarget
      ? priorityTarget.nextAction?.trim() || priorityTarget.targetText
      : catchUp.length
        ? `Complete catch-up for ${topicNames.get(catchUp[0].topicCode) ?? catchUp[0].topicCode}`
        : repeatedDifficultyCode
          ? `Revisit ${topicNames.get(repeatedDifficultyCode) ?? repeatedDifficultyCode}, then complete fresh comparable practice`
          : startingScore == null
            ? "Complete the unit starting-point assessment"
            : input.topics.length === 0
              ? "Await approved module content before assigning unit learning"
              : modulesCompleted === input.topics.length
                ? "Review assessment and project evidence before confirming the next unit"
                : current
                  ? `Continue ${topicNames.get(current.topicCode) ?? current.topicCode} at ${currentSection}`
                  : `Begin ${input.topics[0].code}: ${input.topics[0].title}`;

    return {
      learnerId: learner.id,
      learnerName: learner.name,
      startingPoint,
      startingScore,
      modulesStarted,
      modulesCompleted,
      totalModules: input.topics.length,
      unitProgress,
      currentModule,
      currentSection,
      latestAssessment,
      latestAssessmentDate: latestAttempt?.completedAt ?? null,
      comparableProgress,
      activeTargets: activeTargets.length,
      overdueTargets: overdueTargets.length,
      achievedTargets: achievedTargets.length,
      reviewedFeedback: feedbackAttempts.length,
      feedbackResponse,
      portfolioArtifacts: input.artifacts.filter(row => row.learnerId === learner.id).length,
      worksheets: input.worksheets.filter(row => row.learnerId === learner.id).length,
      outstandingCatchUp: catchUp.length,
      teacherDecisions: decisions.length,
      attention,
      nextStep,
    } satisfies ClassUnitReportRow;
  });

  return {
    className: input.className,
    courseTitle: input.courseTitle,
    unitId: input.unitId,
    unitCode: input.unitCode,
    unitTitle: input.unitTitle,
    generatedAt: input.generatedAt,
    journey: input.journey,
    topics: input.topics,
    rows,
  };
}

export function classUnitReportCsv(report: ClassUnitReport) {
  const rows: unknown[][] = [
    ["Class unit evidence report"],
    ["Class", report.className],
    ["Course", report.courseTitle],
    ["Unit", `${report.unitCode}: ${report.unitTitle}`],
    ["Generated", report.generatedAt],
    ["Shared learning journey", report.journey ? `${report.journey.title} - ${report.journey.status}` : "Not started"],
    [],
    [
      "Learner", "Starting point", "Modules started", "Modules secure", "Approved modules",
      "Unit progress", "Current module", "Current section", "Latest assessment", "Assessment date",
      "Comparable progress", "Active targets", "Overdue targets", "Achieved targets",
      "Reviewed feedback", "Response after feedback", "Portfolio evidence", "Worksheets",
      "Outstanding catch-up", "Teacher decisions", "Attention", "Next step",
    ],
  ];
  report.rows.forEach(row => rows.push([
    row.learnerName, row.startingPoint, row.modulesStarted, row.modulesCompleted, row.totalModules,
    row.unitProgress == null ? "Not calculable" : `${row.unitProgress}%`, row.currentModule,
    row.currentSection, row.latestAssessment, row.latestAssessmentDate ?? "Not yet recorded",
    row.comparableProgress, row.activeTargets, row.overdueTargets, row.achievedTargets,
    row.reviewedFeedback, row.feedbackResponse, row.portfolioArtifacts, row.worksheets,
    row.outstandingCatchUp, row.teacherDecisions, row.attention, row.nextStep,
  ]));
  return rows.map(row => row.map(value => csvCell(
    typeof value === "string" ? plainDisplayText(value) : value,
  )).join(",")).join("\r\n");
}

function evidenceItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === "object") as Record<string, unknown>[]
    : [];
}

function isSecureModule(row: UnitProgressEvidence) {
  return Boolean(row.masteredAt) || (Number(row.masteryScore) >= 80 && row.independentAttempts >= 3);
}

function isStartedModule(row: UnitProgressEvidence) {
  return Boolean(row.topicStartedAt || row.lessonCompletedAt || row.practiceScore != null ||
    row.masteryScore != null || evidenceItems(row.evidence).some(item => item.kind !== "initial_diagnostic"));
}

function attemptKey(attempt: UnitAttemptEvidence) {
  return `${attempt.kind}:${attempt.topicCode ?? ""}:${attempt.paperMode ?? ""}`;
}

function attemptLabel(attempt: UnitAttemptEvidence, topics: Map<string, string>) {
  return attempt.topicCode
    ? `${attempt.topicCode}: ${topics.get(attempt.topicCode) ?? "Topic practice"}`
    : `${attempt.paperMode ?? "unit"} practice paper`;
}

function repeatedDifficulty(attempts: UnitAttemptEvidence[]) {
  const counts = new Map<string, number>();
  attempts.filter(attempt => attempt.topicCode && attempt.percentage < 60).forEach(attempt =>
    counts.set(attempt.topicCode!, (counts.get(attempt.topicCode!) ?? 0) + 1));
  return [...counts.entries()].find(([, count]) => count >= 2)?.[0] ?? null;
}

function average(values: number[]) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function signed(value: number) {
  const rounded = round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}
