import type { ExpertiseLevel } from "./learning-catalog";

export type WorkbookStartingPointProgress = {
  unit_code?: unknown;
  topic_code?: unknown;
  selected_level?: unknown;
  evidence?: unknown;
};

export type WorkbookStartingPointTopic = {
  topicCode: string;
  mark: number;
  maxMark: number;
  percentage: number;
  skills: string[];
};

export type WorkbookStartingPointSummary = {
  unitCode: string;
  complete: boolean;
  mark: number;
  maxMark: number;
  percentage: number;
  recommendedLevel: ExpertiseLevel | null;
  completedAt: string | null;
  topics: WorkbookStartingPointTopic[];
};

/**
 * Projects the server-graded adaptive-workbook diagnostic into one reportable
 * unit result. It never invents missing answers: only independent, unhinted,
 * dated initial-diagnostic evidence stored for the requested unit is counted.
 */
export function summariseWorkbookStartingPoint(
  rows: WorkbookStartingPointProgress[],
  unitCode: string,
  topicCodes: string[],
  minimumPerTopic = 3,
): WorkbookStartingPointSummary | null {
  const expectedTopics = [...new Set(topicCodes)];
  if (!expectedTopics.length) return null;

  const evidenceById = new Map<string, DiagnosticEvidence>();
  const selectedLevels: ExpertiseLevel[] = [];
  for (const row of rows) {
    if (row.unit_code !== unitCode || typeof row.topic_code !== "string" || !expectedTopics.includes(row.topic_code)) continue;
    if (isExpertiseLevel(row.selected_level)) selectedLevels.push(row.selected_level);
    if (!Array.isArray(row.evidence)) continue;
    for (const item of row.evidence) {
      const evidence = diagnosticEvidence(item, unitCode, row.topic_code);
      if (!evidence) continue;
      evidenceById.set(evidence.id, evidence);
    }
  }

  const evidence = [...evidenceById.values()];
  if (!evidence.length) return null;
  const topics = expectedTopics.map(topicCode => {
    const topicEvidence = evidence.filter(item => item.topicCode === topicCode);
    const mark = topicEvidence.filter(item => item.correct).length;
    return {
      topicCode,
      mark,
      maxMark: topicEvidence.length,
      percentage: percentage(mark, topicEvidence.length),
      skills: [...new Set(topicEvidence.map(item => item.skill).filter(Boolean))],
    };
  });
  const mark = evidence.filter(item => item.correct).length;
  const completedAt = evidence.map(item => item.recordedAt).sort().at(-1) ?? null;

  return {
    unitCode,
    complete: topics.every(topic => topic.maxMark >= minimumPerTopic),
    mark,
    maxMark: evidence.length,
    percentage: percentage(mark, evidence.length),
    recommendedLevel: mostFrequent(selectedLevels),
    completedAt,
    topics,
  };
}

type DiagnosticEvidence = {
  id: string;
  topicCode: string;
  skill: string;
  correct: boolean;
  recordedAt: string;
};

function diagnosticEvidence(value: unknown, unitCode: string, topicCode: string): DiagnosticEvidence | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (item.kind !== "initial_diagnostic" || item.unitCode !== unitCode || item.topicCode !== topicCode) return null;
  if (item.independent !== true || Number(item.hintsUsed ?? 0) !== 0 || typeof item.correct !== "boolean") return null;
  if (typeof item.recordedAt !== "string" || !Number.isFinite(Date.parse(item.recordedAt))) return null;
  const fallbackId = `${topicCode}:${String(item.skill ?? "")}:${item.recordedAt}`;
  return {
    id: typeof item.id === "string" && item.id ? item.id : fallbackId,
    topicCode,
    skill: typeof item.skill === "string" ? item.skill : "",
    correct: item.correct,
    recordedAt: item.recordedAt,
  };
}

function isExpertiseLevel(value: unknown): value is ExpertiseLevel {
  return value === "Support" || value === "Core" || value === "Stretch";
}

function mostFrequent(values: ExpertiseLevel[]) {
  if (!values.length) return null;
  const counts = new Map<ExpertiseLevel, number>();
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0][0];
}

function percentage(mark: number, maxMark: number) {
  return maxMark ? Math.round(mark / maxMark * 1000) / 10 : 0;
}
