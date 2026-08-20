import type { ExpertiseLevel } from "./learning-catalog";
import type { PearsonUnit } from "./pearson-curriculum";

export type EvidenceKind =
  | "initial_diagnostic"
  | "guided_practice"
  | "independent_practice"
  | "topic_mastery"
  | "progress_point"
  | "retrieval"
  | "unit_assessment"
  | "project";

export type SkillEvidence = {
  id: string;
  kind: EvidenceKind;
  unitCode: string;
  topicCode: string;
  skill: string;
  learningAim?: string;
  criterion?: string;
  difficulty: 1 | 2 | 3 | 4;
  correct: boolean;
  independent: boolean;
  hintsUsed: number;
  misconception?: string;
  feedback?: string;
  recordedAt: string;
};

export type TopicRouteStatus =
  | "Not started"
  | "Locked"
  | "Recommended"
  | "In progress"
  | "Support required"
  | "Ready for mastery check"
  | "Independently mastered"
  | "Fast-tracked through diagnostic evidence"
  | "Retrieval due"
  | "Completed";

export type TopicRouteDecision = {
  status: TopicRouteStatus;
  reason: string;
  recommendedLevel: ExpertiseLevel;
  recommendedAction: "teach" | "targeted_practice" | "mastery_check" | "next_topic" | "retrieval";
  independentAttempts: number;
  independentAccuracy: number | null;
  retrievalDueAt?: string;
};

export const secureEvidenceMinimum = 3;
export const secureAccuracyMinimum = 0.8;

export function expertiseFromEvidence(evidence: SkillEvidence[]): ExpertiseLevel {
  const independent = evidence.filter(item => item.independent && item.kind === "initial_diagnostic");
  if (independent.length < 3) return "Support";
  const accuracy = independent.filter(item => item.correct).length / independent.length;
  const hardCorrect = independent.filter(item => item.correct && item.difficulty >= 3).length;
  if (accuracy >= 0.9 && hardCorrect >= 2) return "Challenge";
  if (accuracy >= 0.8 && hardCorrect >= 1) return "Stretch";
  if (accuracy >= 0.55) return "Core";
  return "Support";
}

export function decideTopicRoute(evidence: SkillEvidence[], now = new Date()): TopicRouteDecision {
  const independent = evidence.filter(item => item.independent && item.hintsUsed === 0);
  const diagnostics = independent.filter(item => item.kind === "initial_diagnostic");
  const mastery = independent.filter(item => item.kind === "topic_mastery");
  const retrieval = independent.filter(item => item.kind === "retrieval");
  const relevant = mastery.length ? mastery : diagnostics;
  const correct = relevant.filter(item => item.correct).length;
  const accuracy = relevant.length ? correct / relevant.length : null;
  const misconceptions = evidence.filter(item => item.misconception).map(item => item.misconception!);
  const repeatedMisconception = misconceptions.find(value => misconceptions.filter(item => item === value).length >= 2);
  const latestSecure = [...mastery, ...diagnostics]
    .filter(item => item.correct)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  const retrievalDueAt = latestSecure
    ? new Date(new Date(latestSecure.recordedAt).getTime() + 14 * 86_400_000).toISOString()
    : undefined;
  const retrievalDue = retrievalDueAt ? new Date(retrievalDueAt) <= now : false;
  const retrievalAccuracy = retrieval.length ? retrieval.filter(item => item.correct).length / retrieval.length : 0;

  if (retrievalDue && retrieval.length < secureEvidenceMinimum) {
    return decision("Retrieval due", "Earlier secure evidence must now be confirmed with new comparable questions.", "Core", "retrieval", independent.length, accuracy, retrievalDueAt);
  }
  if (retrieval.length >= secureEvidenceMinimum && retrievalAccuracy >= secureAccuracyMinimum) {
    return decision("Completed", `Independent mastery was retained across ${retrieval.length} delayed retrieval questions at ${Math.round(retrievalAccuracy * 100)}%.`, expertiseFromEvidence(evidence), "next_topic", independent.length, retrievalAccuracy);
  }
  if (mastery.length >= secureEvidenceMinimum && (accuracy ?? 0) >= secureAccuracyMinimum) {
    return decision("Independently mastered", `Secure across ${mastery.length} independent mastery tasks at ${Math.round((accuracy ?? 0) * 100)}%.`, expertiseFromEvidence(evidence), "next_topic", independent.length, accuracy, retrievalDueAt);
  }
  if (diagnostics.length >= secureEvidenceMinimum && (accuracy ?? 0) >= secureAccuracyMinimum && diagnostics.some(item => item.difficulty >= 3 && item.correct)) {
    return decision("Fast-tracked through diagnostic evidence", `Fast-tracked from ${correct}/${diagnostics.length} independent diagnostic answers, including higher-difficulty evidence. Mandatory assessed work remains required.`, expertiseFromEvidence(evidence), "retrieval", independent.length, accuracy, retrievalDueAt);
  }
  if (repeatedMisconception) {
    return decision("Support required", `Repeated misconception: ${repeatedMisconception}. Review the linked teaching explanation before targeted practice.`, "Support", "teach", independent.length, accuracy);
  }
  if (relevant.length >= secureEvidenceMinimum && (accuracy ?? 0) < 0.55) {
    return decision("Support required", `Only ${correct}/${relevant.length} independent answers were correct. Re-teaching is recommended.`, "Support", "teach", independent.length, accuracy);
  }
  if (relevant.length >= secureEvidenceMinimum && (accuracy ?? 0) < secureAccuracyMinimum) {
    return decision("In progress", `Evidence is mixed (${correct}/${relevant.length}); use the shorter review route rather than skipping.`, "Core", "targeted_practice", independent.length, accuracy);
  }
  if (evidence.some(item => item.kind === "independent_practice" && item.independent)) {
    return decision("Ready for mastery check", "Independent practice is recorded; complete a separate mastery check without hints.", "Core", "mastery_check", independent.length, accuracy);
  }
  return decision(evidence.length ? "In progress" : "Not started", evidence.length ? "Learning evidence has started but is not yet sufficient for a secure judgement." : "No academic evidence has been recorded yet.", expertiseFromEvidence(evidence), "teach", independent.length, accuracy);
}

function decision(status: TopicRouteStatus, reason: string, recommendedLevel: ExpertiseLevel, recommendedAction: TopicRouteDecision["recommendedAction"], independentAttempts: number, independentAccuracy: number | null, retrievalDueAt?: string): TopicRouteDecision {
  return { status, reason, recommendedLevel, recommendedAction, independentAttempts, independentAccuracy, retrievalDueAt };
}

export function levelChoiceWarning(chosen: ExpertiseLevel, recommended: ExpertiseLevel) {
  const order: ExpertiseLevel[] = ["Support", "Core", "Stretch", "Challenge"];
  const difference = order.indexOf(chosen) - order.indexOf(recommended);
  if (Math.abs(difference) < 2) return null;
  return difference > 0
    ? `You selected ${chosen}, which has substantially less scaffolding than the recommended ${recommended} route. You can switch back at any time.`
    : `You selected ${chosen}, which is substantially more scaffolded than the recommended ${recommended} route. This will not reduce mandatory assessment requirements.`;
}

export function academicProgress(decisions: TopicRouteDecision[]) {
  if (!decisions.length) return 0;
  const completed = decisions.filter(item => ["Independently mastered", "Fast-tracked through diagnostic evidence", "Completed"].includes(item.status)).length;
  return Math.round((completed / decisions.length) * 100);
}

export function visualPathStatuses(decisions: TopicRouteDecision[]): TopicRouteStatus[] {
  const completed = new Set<TopicRouteStatus>(["Independently mastered", "Fast-tracked through diagnostic evidence", "Completed"]);
  const firstActionable = decisions.findIndex(item => !completed.has(item.status));
  return decisions.map((item, index) => {
    if (item.status !== "Not started") return item.status;
    if (index === firstActionable) return "Recommended";
    if (index > firstActionable) return "Locked";
    return item.status;
  });
}

export type DiagnosticQuestion = {
  id: string;
  unitCode: string;
  topicCode: string;
  skill: string;
  prompt: string;
  options: string[];
  answer: number;
  difficulty: 1 | 2 | 3 | 4;
  misconception: string;
  explanation: string;
};

/** Three independent items per topic are used so no topic can be fast-tracked from one answer. */
export function diagnosticQuestionsFor(unit: PearsonUnit): DiagnosticQuestion[] {
  return unit.topics.flatMap((topic, topicIndex) => {
    const distractors = unit.topics.filter(item => item.code !== topic.code).flatMap(item => item.content).slice(topicIndex % 3, topicIndex % 3 + 3);
    const skills = topic.content.slice(0, 3);
    return skills.map((skill, index) => {
      const options = [skill, ...distractors.filter(item => item !== skill)].slice(0, 4);
      const shift = (topicIndex + index) % options.length;
      const rotated = [...options.slice(shift), ...options.slice(0, shift)];
      return {
        id: `${unit.code}:${topic.code}:diagnostic:${index + 1}`,
        unitCode: unit.code,
        topicCode: topic.code,
        skill,
        prompt: index === 0
          ? `A client brief requires work specifically involving ${topic.title.toLowerCase()}. Which knowledge or skill is directly relevant?`
          : index === 1
            ? `Which option should be applied first when solving a new ${topic.title.toLowerCase()} problem?`
            : `Which option provides the strongest evidence that a learner understands ${topic.title.toLowerCase()}?`,
        options: rotated,
        answer: rotated.indexOf(skill),
        difficulty: (index + 2) as 2 | 3 | 4,
        misconception: `Confuses ${topic.title.toLowerCase()} with content from another topic`,
        explanation: `${skill} is explicitly part of ${topic.code} ${topic.title}. The other options belong to different curriculum topics and do not best meet this requirement.`,
      };
    });
  });
}
