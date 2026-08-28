import {
  diagnosticQuestionsFor,
  expertiseFromEvidence,
  type SkillEvidence,
} from "./adaptive-workbook";
import { metaForUnit, type ExpertiseLevel } from "./learning-catalog";
import type { PearsonUnit } from "./pearson-curriculum";

export type StartingPointResponse = {
  questionId: string;
  selectedOption: number;
};

export type StartingPointGrade =
  | {
    ok: true;
    evidence: SkillEvidence[];
    recommendedLevel: ExpertiseLevel;
  }
  | { ok: false };

/**
 * Reconstruct and mark the fixed diagnostic on the server. The client supplies
 * only its selected option, never a correctness flag or pathway decision.
 */
export function gradeStartingPointResponses(
  unit: PearsonUnit,
  responses: StartingPointResponse[],
  recordedAt: string,
): StartingPointGrade {
  const questions = diagnosticQuestionsFor(unit);
  if (responses.length !== questions.length) return { ok: false };

  const responseByQuestion = new Map<string, StartingPointResponse>();
  for (const response of responses) {
    if (responseByQuestion.has(response.questionId)) return { ok: false };
    responseByQuestion.set(response.questionId, response);
  }

  const unitMeta = metaForUnit(unit.code);
  const evidence: SkillEvidence[] = [];
  for (const question of questions) {
    const response = responseByQuestion.get(question.id);
    if (!response || !Number.isInteger(response.selectedOption)
      || response.selectedOption < 0 || response.selectedOption >= question.options.length) {
      return { ok: false };
    }
    const correct = response.selectedOption === question.answer;
    evidence.push({
      id: `${question.id}:${recordedAt}`,
      kind: "initial_diagnostic",
      unitCode: unit.code,
      topicCode: question.topicCode,
      skill: question.skill,
      learningAim: unitMeta.aims.find(aim => aim.startsWith(question.topicCode.charAt(0)))
        ?? unitMeta.aims[0],
      criterion: unitMeta.criteria[0],
      difficulty: question.difficulty,
      correct,
      independent: true,
      hintsUsed: 0,
      ...(correct ? {} : { misconception: question.misconception }),
      feedback: question.explanation,
      recordedAt,
    });
  }

  return {
    ok: true,
    evidence,
    recommendedLevel: expertiseFromEvidence(evidence),
  };
}
