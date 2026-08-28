export type CurriculumOverviewTone = "neutral" | "info" | "positive" | "warning" | "danger";

export type CurriculumOverviewCell = {
  status: string;
  detail: string;
  tone: CurriculumOverviewTone;
};

export type CurriculumOverviewProgress = {
  learnerId: string;
  topicCode: string;
  topicStartedAt: string | null;
  lessonCompletedAt: string | null;
  masteryScore: number | null;
  masteredAt: string | null;
  currentSection: string | null;
  independentAttempts: number;
  updatedAt: string;
};

export type CurriculumOverviewAssessment = {
  learnerId: string;
  title: string | null;
  kind: string;
  percentage: number | null;
  completedAt: string;
};

export type CurriculumPaperAttempt = {
  learnerId: string;
  kind: string;
  unitCode: string;
  paperMode: string | null;
  percentage: number;
  teacherMark: number | null;
  maxMark: number;
  completedAt: string;
};

export type CurriculumOverviewTarget = {
  learnerId: string;
  status: string;
  targetDate: string;
};

export type CurriculumOverviewAttention = {
  learnerId: string;
  startingScore: number | null;
  status: string;
  reason: string;
};

export type ClassCurriculumOverviewInput = {
  generatedAt: string;
  learners: { id: string; name: string }[];
  modules: { code: string; title: string }[];
  progress: CurriculumOverviewProgress[];
  assessments: CurriculumOverviewAssessment[];
  targets: CurriculumOverviewTarget[];
  attention: CurriculumOverviewAttention[];
};

export type ClassCurriculumOverviewRow = {
  learnerId: string;
  learnerName: string;
  startingPoint: CurriculumOverviewCell;
  unitProgress: CurriculumOverviewCell;
  currentModule: CurriculumOverviewCell;
  assessment: CurriculumOverviewCell;
  targets: CurriculumOverviewCell;
  attention: CurriculumOverviewCell;
};

export function projectCurriculumPaperAssessments(
  attempts: CurriculumPaperAttempt[],
  unitCode: string,
): CurriculumOverviewAssessment[] {
  return attempts
    .filter(attempt => attempt.kind === "practice_paper" && attempt.unitCode === unitCode)
    .map(attempt => ({
      learnerId: attempt.learnerId,
      title: curriculumPaperTitle(attempt.paperMode, attempt.teacherMark == null),
      kind: attempt.paperMode ?? attempt.kind,
      percentage: attempt.paperMode === "assignment"
        ? attempt.teacherMark == null || attempt.maxMark <= 0
          ? null
          : attempt.teacherMark / attempt.maxMark * 100
        : attempt.percentage,
      completedAt: attempt.completedAt,
    }));
}

export function projectClassCurriculumOverview(
  input: ClassCurriculumOverviewInput,
): ClassCurriculumOverviewRow[] {
  const generatedDate = isoDate(input.generatedAt);
  const moduleTitle = new Map(input.modules.map(module => [module.code, module.title]));
  return [...input.learners]
    .sort((left, right) => left.name.localeCompare(right.name, "en-GB"))
    .map(learner => {
      const progress = input.progress
        .filter(row => row.learnerId === learner.id)
        .sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt));
      const assessments = input.assessments
        .filter(row => row.learnerId === learner.id)
        .sort((left, right) => timestamp(right.completedAt) - timestamp(left.completedAt));
      const targets = input.targets.filter(row => row.learnerId === learner.id);
      const attention = input.attention.find(row => row.learnerId === learner.id);
      const startedCodes = new Set(progress.filter(row => row.topicStartedAt).map(row => row.topicCode));
      const masteredCodes = new Set(progress.filter(isIndependentlyMastered).map(row => row.topicCode));
      const moduleCount = input.modules.length;
      const current = progress.find(row => !isIndependentlyMastered(row)) ?? progress[0];
      const latestAssessment = assessments[0];
      const overdueTargets = targets.filter(target =>
        generatedDate != null && isoDate(target.targetDate) != null
          && isoDate(target.targetDate)! < generatedDate);
      const nextTarget = [...targets].sort((left, right) =>
        timestamp(left.targetDate) - timestamp(right.targetDate))[0];

      return {
        learnerId: learner.id,
        learnerName: learner.name,
        startingPoint: attention?.startingScore == null
          ? cell("Not recorded", "No secure starting-point score is stored for this class.", "neutral")
          : cell("Recorded", `${formatPercentage(attention.startingScore)} starting point`, "info"),
        unitProgress: progress.length === 0
          ? cell("Not started", "No module learning evidence is recorded for this unit.", "neutral")
          : moduleCount > 0 && masteredCodes.size >= moduleCount
            ? cell("Complete", `${masteredCodes.size} of ${moduleCount} modules independently mastered.`, "positive")
            : cell(
              "In progress",
              moduleCount > 0
                ? `${startedCodes.size} of ${moduleCount} modules started · ${masteredCodes.size} independently mastered.`
                : `${startedCodes.size} module(s) started · ${masteredCodes.size} independently mastered.`,
              "info",
            ),
        currentModule: current
          ? cell(
            moduleTitle.get(current.topicCode) ?? current.topicCode,
            `${formatSection(current.currentSection)} · updated ${formatDate(current.updatedAt)}.`,
            isIndependentlyMastered(current) ? "positive" : "info",
          )
          : cell("Not started", "No current module is recorded.", "neutral"),
        assessment: latestAssessment
          ? cell(
            "Recorded",
            `${latestAssessment.title ?? formatKind(latestAssessment.kind)} · ${latestAssessment.percentage == null
              ? "completed; mark not recorded"
              : formatPercentage(latestAssessment.percentage)} · ${formatDate(latestAssessment.completedAt)}.`,
            latestAssessment.percentage != null && latestAssessment.percentage < 50 ? "warning" : "info",
          )
          : cell("Not recorded", "No completed assessment evidence is stored for this class and unit.", "neutral"),
        targets: targets.length === 0
          ? cell("No active target", "No approved, active or extended target is stored.", "neutral")
          : overdueTargets.length > 0
            ? cell(
              "Overdue",
              `${overdueTargets.length} of ${targets.length} active target(s) overdue.`,
              "danger",
            )
            : cell(
              `${targets.length} active`,
              nextTarget ? `Next due ${formatDate(nextTarget.targetDate)}.` : "Target date not recorded.",
              "info",
            ),
        attention: attention
          ? cell(attentionLabel(attention.status), attention.reason, attentionTone(attention.status))
          : cell("Not available", "No class attention projection was returned.", "neutral"),
      };
    });
}

function isIndependentlyMastered(row: CurriculumOverviewProgress) {
  return Boolean(row.masteredAt) || (
    row.masteryScore != null && row.masteryScore >= 70 && row.independentAttempts >= 3
  );
}

function cell(status: string, detail: string, tone: CurriculumOverviewTone) {
  return { status, detail, tone } satisfies CurriculumOverviewCell;
}

function attentionLabel(value: string) {
  return ({
    intervention_required: "Intervention",
    action_required: "Action needed",
    catch_up_required: "Catch-up",
    exceeding: "Exceeding",
    on_track: "On track",
  } as Record<string, string>)[value] ?? formatKind(value);
}

function attentionTone(value: string): CurriculumOverviewTone {
  if (value === "intervention_required") return "danger";
  if (value === "action_required" || value === "catch_up_required") return "warning";
  if (value === "exceeding" || value === "on_track") return "positive";
  return "neutral";
}

function formatSection(value: string | null) {
  if (!value) return "Learning in progress";
  const [section, step] = value.split(":");
  const label = formatKind(section);
  return step ? `${label} ${step}` : label;
}

function formatKind(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function curriculumPaperTitle(mode: string | null, awaitingReview: boolean) {
  if (mode === "assignment") return awaitingReview ? "Assignment (awaiting review)" : "Assignment";
  if (mode === "knowledge") return "Knowledge practice paper";
  if (mode === "applied") return "Applied practice paper";
  return "Practice paper";
}

function formatPercentage(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date unavailable" : date.toLocaleDateString("en-GB");
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function isoDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
