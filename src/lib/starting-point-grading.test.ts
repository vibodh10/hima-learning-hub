import { describe, expect, it } from "vitest";
import { diagnosticQuestionsFor } from "./adaptive-workbook";
import { configuredUnits } from "./learning-catalog";
import { gradeStartingPointResponses } from "./starting-point-grading";

const unit = configuredUnits.find(item => item.code === "4")!;
const questions = diagnosticQuestionsFor(unit);
const recordedAt = "2026-08-29T00:00:00.000Z";

describe("server-authoritative starting-point grading", () => {
  it("marks canonical answers and derives the route on the server", () => {
    const grade = gradeStartingPointResponses(unit, questions.map(question => ({
      questionId: question.id,
      selectedOption: question.answer,
    })), recordedAt);

    expect(grade).toMatchObject({ ok: true, recommendedLevel: "Challenge" });
    if (!grade.ok) throw new Error("Expected a valid grade");
    expect(grade.evidence).toHaveLength(questions.length);
    expect(grade.evidence.every(item => item.correct && item.unitCode === "4"
      && item.kind === "initial_diagnostic" && item.independent && item.hintsUsed === 0))
      .toBe(true);
  });

  it("derives support from incorrect selected options rather than accepting a client score", () => {
    const grade = gradeStartingPointResponses(unit, questions.map(question => ({
      questionId: question.id,
      selectedOption: (question.answer + 1) % question.options.length,
    })), recordedAt);

    expect(grade).toMatchObject({ ok: true, recommendedLevel: "Support" });
    if (!grade.ok) throw new Error("Expected a valid grade");
    expect(grade.evidence.every(item => !item.correct)).toBe(true);
  });

  it("rejects partial, duplicate, unknown, and out-of-range response sets", () => {
    const valid = questions.map(question => ({
      questionId: question.id,
      selectedOption: question.answer,
    }));

    expect(gradeStartingPointResponses(unit, valid.slice(1), recordedAt)).toEqual({ ok: false });
    expect(gradeStartingPointResponses(unit, [valid[0], valid[0], ...valid.slice(2)], recordedAt))
      .toEqual({ ok: false });
    expect(gradeStartingPointResponses(unit, [{ questionId: "unknown", selectedOption: 0 }, ...valid.slice(1)], recordedAt))
      .toEqual({ ok: false });
    expect(gradeStartingPointResponses(unit, [{ ...valid[0], selectedOption: 99 }, ...valid.slice(1)], recordedAt))
      .toEqual({ ok: false });
  });
});
