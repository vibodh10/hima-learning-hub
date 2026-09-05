import type { AtomQuestionResult } from "./atom-attempt-grading";

type ExistingProgress = {
  evidence?: unknown;
  mastery_score?: number | null;
  mastered_at?: string | null;
};

export function projectTopicTestProgress(
  existing: ExistingProgress | null,
  results: AtomQuestionResult[],
  percentage: number,
  completedAt: string,
) {
  const existingEvidence = Array.isArray(existing?.evidence) ? existing.evidence : [];
  const testEvidence = results.map(result => ({
    id: result.id,
    kind: result.correct && result.hintsUsed === 0 ? "topic_mastery" : "topic_test",
    independent: result.hintsUsed === 0,
    hintsUsed: result.hintsUsed,
    correct: result.correct,
    marks: result.marks,
    awardedMarks: result.awardedMarks,
    recordedAt: completedAt,
  }));
  const evidence = [...existingEvidence, ...testEvidence];
  const independentAttempts = evidence.filter(item => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return row.kind === "topic_mastery" && row.independent === true && Number(row.hintsUsed ?? 0) === 0;
  }).length;
  const newlySecure = percentage >= 80 && independentAttempts >= 3;
  const alreadySecure = existing?.mastered_at != null && Number(existing.mastery_score ?? 0) >= 80;

  return {
    evidence,
    independentAttempts,
    masteryScore: newlySecure ? percentage : alreadySecure ? Number(existing?.mastery_score) : null,
    masteredAt: newlySecure ? completedAt : alreadySecure ? existing?.mastered_at ?? null : null,
    complete: newlySecure || alreadySecure,
  };
}
