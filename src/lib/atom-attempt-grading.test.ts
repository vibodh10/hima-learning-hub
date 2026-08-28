import { describe, expect, it } from "vitest";
import { markQuestion, paperQuestions, questionsFor, scoreQuestion } from "./atom-question-bank";
import { gradeAtomAttempt } from "./atom-attempt-grading";
import { configuredUnits } from "./learning-catalog";

const unit = configuredUnits.find(item => item.code === "4")!;
const topic = unit.topics[0];
const topicQuestions = questionsFor(unit, topic);

describe("server-authoritative curriculum attempt grading", () => {
  it("reconstructs topic practice and calculates marks from raw answers", () => {
    const grade = gradeAtomAttempt(unit, {
      kind: "topic_practice",
      unitCode: unit.code,
      topicCode: topic.code,
      paperMode: null,
      paperVersion: null,
      selectedLevel: "Core",
      activeSeconds: 300,
      responses: topicQuestions.map(question => ({
        id: question.id,
        answer: question.options ? String(question.answer) : question.modelAnswer,
        hintsUsed: 0,
      })),
    });

    expect(grade).toMatchObject({ ok: true, requiresReview: false });
    if (!grade.ok) throw new Error("Expected a valid grade");
    const expectedMark = topicQuestions.reduce((sum, question) => sum + scoreQuestion(
      question,
      question.options ? String(question.answer) : question.modelAnswer,
    ), 0);
    expect(grade.mark).toBe(expectedMark);
    expect(grade.percentage).toBe(Math.round(expectedMark / grade.maxMark * 100));
    expect(grade.results.map(result => ({
      correct: result.correct,
      awardedMarks: result.awardedMarks,
    }))).toEqual(topicQuestions.map(question => ({
      correct: markQuestion(question, question.options ? String(question.answer) : question.modelAnswer),
      awardedMarks: scoreQuestion(question, question.options ? String(question.answer) : question.modelAnswer),
    })));
  });

  it("rejects partial, duplicate and unknown question sets", () => {
    const responses = topicQuestions.map(question => ({
      id: question.id,
      answer: question.options ? String(question.answer) : question.modelAnswer,
      hintsUsed: 0,
    }));
    const base = {
      kind: "topic_practice" as const,
      unitCode: unit.code,
      topicCode: topic.code,
      paperMode: null,
      paperVersion: null,
      selectedLevel: "Core" as const,
      activeSeconds: 300,
    };

    expect(gradeAtomAttempt(unit, { ...base, responses: responses.slice(1) })).toEqual({ ok: false });
    expect(gradeAtomAttempt(unit, { ...base, responses: [responses[0], responses[0], ...responses.slice(2)] }))
      .toEqual({ ok: false });
    expect(gradeAtomAttempt(unit, { ...base, responses: [{ ...responses[0], id: "unknown" }, ...responses.slice(1)] }))
      .toEqual({ ok: false });
  });

  it("keeps written and practical papers awaiting teacher review with canonical marks", () => {
    const version = 2;
    const questions = paperQuestions(unit, version, "applied");
    const grade = gradeAtomAttempt(unit, {
      kind: "practice_paper",
      unitCode: unit.code,
      topicCode: null,
      paperMode: "applied",
      paperVersion: version,
      selectedLevel: null,
      activeSeconds: 1200,
      responses: questions.map(question => ({ id: question.id, answer: question.modelAnswer, hintsUsed: 0 })),
    });

    expect(grade).toMatchObject({ ok: true, mark: 0, percentage: 0, requiresReview: true });
    if (!grade.ok) throw new Error("Expected a valid grade");
    expect(grade.maxMark).toBe(questions.reduce((sum, question) => sum + question.marks, 0));
    expect(grade.results.every(result => result.awardedMarks === 0 && !result.correct)).toBe(true);
  });
});
