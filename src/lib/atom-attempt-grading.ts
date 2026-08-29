import {
  markQuestion,
  paperQuestions,
  questionsFor,
  scoreQuestion,
  type PaperMode,
} from "./atom-question-bank";
import type { PearsonUnit } from "./pearson-curriculum";

export type AtomResponse = {
  id: string;
  answer: string;
  hintsUsed: number;
};

export type AtomAttemptSubmission = {
  kind: "topic_practice" | "practice_paper";
  unitCode: string;
  topicCode: string | null;
  paperMode: PaperMode | null;
  paperVersion: number | null;
  activeSeconds: number;
  responses: AtomResponse[];
};

export type AtomQuestionResult = {
  id: string;
  difficulty: number;
  correct: boolean;
  hintsUsed: number;
  marks: number;
  awardedMarks: number;
  answer: string;
};

export type AtomAttemptGrade =
  | {
    ok: true;
    mark: number;
    maxMark: number;
    percentage: number;
    hintsUsed: number;
    requiresReview: boolean;
    results: AtomQuestionResult[];
  }
  | { ok: false };

/** Reconstructs the approved question set and calculates all marks server-side. */
export function gradeAtomAttempt(
  unit: PearsonUnit,
  submission: AtomAttemptSubmission,
): AtomAttemptGrade {
  if (submission.unitCode !== unit.code) return { ok: false };
  const topic = submission.topicCode
    ? unit.topics.find(item => item.code === submission.topicCode)
    : undefined;
  const questions = submission.kind === "topic_practice"
    ? topic && submission.paperMode === null && submission.paperVersion === null
      ? questionsFor(unit, topic)
      : null
    : submission.topicCode === null && submission.paperMode !== null
      && submission.paperVersion !== null
      ? paperQuestions(unit, submission.paperVersion, submission.paperMode)
      : null;
  if (!questions || submission.responses.length !== questions.length) return { ok: false };

  const responseById = new Map<string, AtomResponse>();
  for (const response of submission.responses) {
    if (responseById.has(response.id)) return { ok: false };
    responseById.set(response.id, response);
  }

  const requiresReview = submission.kind === "practice_paper"
    && questions.some(question => !question.options);
  const results: AtomQuestionResult[] = [];
  for (const question of questions) {
    const response = responseById.get(question.id);
    if (!response || !Number.isInteger(response.hintsUsed)
      || response.hintsUsed < 0 || response.hintsUsed > 5) return { ok: false };
    const awardedMarks = requiresReview ? 0 : scoreQuestion(question, response.answer);
    results.push({
      id: question.id,
      difficulty: question.difficulty,
      correct: requiresReview ? false : markQuestion(question, response.answer),
      hintsUsed: response.hintsUsed,
      marks: question.marks,
      awardedMarks,
      answer: response.answer,
    });
  }

  const maxMark = questions.reduce((sum, question) => sum + question.marks, 0);
  const mark = results.reduce((sum, result) => sum + result.awardedMarks, 0);
  return {
    ok: true,
    mark,
    maxMark,
    percentage: maxMark ? Math.round(mark / maxMark * 100) : 0,
    hintsUsed: results.reduce((sum, result) => sum + result.hintsUsed, 0),
    requiresReview,
    results,
  };
}
