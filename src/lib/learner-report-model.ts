export const PRIOR_EXPERIENCE_SKILLS = new Set([
  "Broad digital knowledge",
  "Programming experience",
  "Database experience",
  "Web-development experience",
  "Game-development experience",
  "Project-working experience",
  "Study habits",
]);

export type EvidenceCounts = {
  startingQuestionCount: number;
  progressQuestionCount: number;
  startingSufficient: boolean;
  progressSufficient: boolean;
};

export function evidenceCounts(value: unknown): EvidenceCounts {
  const record = asRecord(value);
  return {
    startingQuestionCount: Number(record.starting_question_count ?? 0),
    progressQuestionCount: Number(record.progress_question_count ?? 0),
    startingSufficient: record.starting_sufficient === true,
    progressSufficient: record.progress_sufficient === true,
  };
}

export function isPriorExperienceSkill(title: string) {
  return PRIOR_EXPERIENCE_SKILLS.has(title);
}

export function hasValidComparableProgress(input: {
  latestPercentage: number | null;
  improvementPoints: number | null;
  evidence: unknown;
  progressDate?: string | null;
  progressHints?: number | null;
}) {
  const counts = evidenceCounts(input.evidence);
  return counts.startingSufficient && counts.progressSufficient &&
    input.latestPercentage != null && input.improvementPoints != null &&
    Boolean(input.progressDate);
}

export function academicEvidenceLabel(input: {
  attemptsCount: number;
  hintsUsed: number;
  masteryScore: number;
  retrievalScore: number | null;
  isFormalAssessment?: boolean;
  isProgressPoint?: boolean;
}) {
  if (input.attemptsCount < 2) return "Insufficient evidence";
  if (input.hintsUsed > 0) return input.masteryScore >= 70 ? "Developing with support" : "Requires support";
  if (input.retrievalScore != null && input.retrievalScore >= 70 && input.masteryScore >= 70) return "Sustained mastery";
  if (input.isProgressPoint) return input.masteryScore >= 70 ? "Independent progress-point evidence" : "Progress-point support required";
  if (input.isFormalAssessment) return input.masteryScore >= 70 ? "Independent formal assessment evidence" : "Formal assessment support required";
  return input.masteryScore >= 70 ? "Independent practice evidence" : "Developing";
}

export function conciseCurrentJudgement(input: {
  startingQuestionCount: number;
  startingSufficient: boolean;
  progressSufficient: boolean;
  validComparableProgress: boolean;
  hintsUsed?: number;
  latestPercentage?: number | null;
}) {
  if (input.startingQuestionCount === 0) return "Not yet assessed";
  if (!input.startingSufficient && !input.validComparableProgress) return "Initial indication — limited evidence";
  if (!input.validComparableProgress || !input.progressSufficient) return "Awaiting comparable progress evidence";
  if (Number(input.hintsUsed ?? 0) > 0) return "Progress demonstrated with support";
  return Number(input.latestPercentage ?? 0) >= 70
    ? "Independently demonstrated"
    : "Requires development";
}

export function topicAssessmentStatus(input: {
  sampledSkills: number;
  totalSkills: number;
  secureBaselineSkills: number;
  completedProgressSkills: number;
}) {
  if (input.completedProgressSkills > 0) return "Progress point completed";
  if (input.sampledSkills === 0) return "Not started";
  if (input.sampledSkills < input.totalSkills || input.secureBaselineSkills < input.totalSkills) return "Partially assessed";
  return "Baseline established";
}

export function reportTargetStatus(
  status: string,
  deadline: string,
  asAt: Date,
) {
  const labels: Record<string, string> = {
    proposed: "Proposed",
    approved: "Active",
    active: "Active",
    extended: "Active",
    achieved: "Achieved",
    partially_achieved: "Partially achieved",
    not_achieved: "Not achieved",
    replaced: "Replaced",
    archived: "Closed",
    closed: "Closed",
  };
  if (["proposed", "approved", "active", "extended"].includes(status) &&
      new Date(`${deadline}T23:59:59`) < asAt) return "Overdue";
  return labels[status] ?? status.replaceAll("_", " ");
}

export function improvementAfterFeedback(input: {
  originalResult: number | null;
  followUpResult: number | null;
  feedback: string | null;
}) {
  if (!input.feedback || input.originalResult == null || input.followUpResult == null) return null;
  return input.followUpResult - input.originalResult;
}

export function learnerReflectionLabel(value: string | null | undefined) {
  return value?.trim() ? value : "Learner reflection not yet provided.";
}

export function decliningEvidence(input: {
  change: number | null;
  progressDifficulty?: string | null;
  startingDifficulty?: string | null;
  progressHints?: number | null;
  reviewDate?: string | null;
}) {
  if (input.change == null || input.change >= 0) return null;
  return {
    declined: true,
    difficultyChanged: Boolean(input.progressDifficulty && input.startingDifficulty &&
      input.progressDifficulty !== input.startingDifficulty),
    supportUsed: Number(input.progressHints ?? 0) > 0,
    explanation: "The recorded result declined; the evidence does not establish a cause.",
    action: input.reviewDate ? `Teacher review or reassessment planned for ${input.reviewDate}.` :
      "Teacher review and a comparable reassessment are required.",
  };
}

export function groupByTopic<T extends { unitTitle: string; topicTitle: string }>(items: T[]) {
  const grouped = new Map<string, { unitTitle: string; topicTitle: string; items: T[] }>();
  for (const item of items) {
    const key = `${item.unitTitle}\u0000${item.topicTitle}`;
    const group = grouped.get(key) ?? { unitTitle: item.unitTitle, topicTitle: item.topicTitle, items: [] };
    group.items.push(item);
    grouped.set(key, group);
  }
  return [...grouped.values()];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
