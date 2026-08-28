import type { ExpertiseLevel } from "./learning-catalog";
import { decideTopicRoute, type SkillEvidence, type TopicRouteDecision } from "./adaptive-workbook";

export type TopicEvidence = {
  startedAt?: string;
  lessonCompletedAt?: string;
  practiceScore?: number;
  hintsUsed?: number;
  masteryScore?: number;
  masteredAt?: string;
  currentSection?: string;
  independentAttempts?: number;
  retrievalDueAt?: string;
  fastTrackReason?: string;
  evidence?: SkillEvidence[];
};

export type LearningProgress = {
  level?: ExpertiseLevel;
  recommendedLevel?: ExpertiseLevel;
  diagnosticCompletedAt?: string;
  currentPosition?: { unitCode: string; topicCode: string; section: string };
  background?: { experience?: string; confidence?: string; supportNeeds?: string };
  projectUnlocks?: Record<string, { reason: string; teacher: string; recordedAt: string }>;
  topics: Record<string, TopicEvidence>;
};

export const progressKey = "hima-learning-progress-v1";

export function progressKeyFor(learnerId: string) {
  return `${progressKey}:${learnerId}`;
}

export function topicKey(unitCode: string, topicCode: string) {
  return `${unitCode}:${topicCode}`;
}

export type CurriculumPositionRow = {
  unit_code: string;
  topic_code: string;
  topic_started_at: string | null;
  current_section: string | null;
  mastery_score: number | string | null;
  independent_attempts: number | null;
  updated_at: string;
};

export function latestIncompleteCurriculumPosition(rows: CurriculumPositionRow[]) {
  const latest = [...rows]
    .filter(row => row.topic_started_at && !(Number(row.mastery_score) >= 80 && Number(row.independent_attempts) >= 3))
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())[0];
  return latest ? {
    unitCode: latest.unit_code,
    topicCode: latest.topic_code,
    section: latest.current_section ?? "lesson:1",
    updatedAt: latest.updated_at,
  } : undefined;
}

export function projectReady(progress: LearningProgress, unitCode: string, requiredTopics: string[]) {
  const missing = requiredTopics.filter(code => {
    const topic = progress.topics[topicKey(unitCode, code)];
    const decision = routeForTopic(topic);
    return !["Independently mastered", "Completed"].includes(decision.status);
  });
  const override = progress.projectUnlocks?.[unitCode];
  return { ready: missing.length === 0 || Boolean(override), missing, percentage: Math.round(((requiredTopics.length - missing.length) / Math.max(requiredTopics.length, 1)) * 100), override };
}

export function routeForTopic(topic?: TopicEvidence): TopicRouteDecision {
  if (topic?.evidence?.length) return decideTopicRoute(topic.evidence);
  if ((topic?.masteryScore ?? 0) >= 70 && (topic?.independentAttempts ?? 0) >= 3) {
    return {
      status: "Independently mastered", reason: `Legacy independent evidence: ${topic?.independentAttempts} attempts at ${topic?.masteryScore}%.`,
      recommendedLevel: "Core", recommendedAction: "next_topic", independentAttempts: topic?.independentAttempts ?? 0,
      independentAccuracy: (topic?.masteryScore ?? 0) / 100, retrievalDueAt: topic?.retrievalDueAt,
    };
  }
  if (topic?.practiceScore != null) return { status: "Ready for mastery check", reason: "Independent practice is recorded.", recommendedLevel: "Core", recommendedAction: "mastery_check", independentAttempts: topic.independentAttempts ?? 0, independentAccuracy: null };
  if (topic?.lessonCompletedAt || topic?.startedAt) return { status: "In progress", reason: "Teaching has started.", recommendedLevel: "Core", recommendedAction: "teach", independentAttempts: 0, independentAccuracy: null };
  return { status: "Not started", reason: "No academic evidence has been recorded yet.", recommendedLevel: "Support", recommendedAction: "teach", independentAttempts: 0, independentAccuracy: null };
}
