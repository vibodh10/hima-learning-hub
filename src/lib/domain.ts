export type Pathway = "Support" | "Core" | "Stretch" | "Mastery";
export type QuestionKind = "single_choice" | "multiple_response" | "true_false" | "fill_blank" | "numeric";

export type MarkableQuestion = {
  id: string;
  type: QuestionKind;
  correctAnswer: string | string[] | number | boolean;
  alternatives?: string[];
  tolerance?: number;
  marks: number;
};

const normalise = (value: unknown) => String(value).trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");

export function markAnswer(question: MarkableQuestion, answer: unknown) {
  let correct = false;
  if (question.type === "multiple_response") {
    const expected = (question.correctAnswer as string[]).map(normalise).sort();
    const actual = (Array.isArray(answer) ? answer : [answer]).map(normalise).sort();
    correct = expected.length === actual.length && expected.every((value, index) => value === actual[index]);
  } else if (question.type === "numeric") {
    const actual = Number(answer);
    const expected = Number(question.correctAnswer);
    correct = Number.isFinite(actual) && Math.abs(actual - expected) <= (question.tolerance ?? 0);
  } else if (question.type === "fill_blank") {
    const accepted = [question.correctAnswer, ...(question.alternatives ?? [])].map(normalise);
    correct = accepted.includes(normalise(answer));
  } else {
    correct = normalise(answer) === normalise(question.correctAnswer);
  }
  return { correct, mark: correct ? question.marks : 0, maxMark: question.marks };
}

export function percentage(mark: number, maxMark: number) {
  return maxMark <= 0 ? 0 : Math.round((mark / maxMark) * 100);
}

export function pathwayFor(score: number, hintsUsed = 0): Pathway {
  const adjusted = Math.max(0, score - Math.min(hintsUsed * 4, 20));
  if (adjusted < 50) return "Support";
  if (adjusted < 70) return "Core";
  if (adjusted < 85) return "Stretch";
  return "Mastery";
}

export function progressSummary(scores: number[]) {
  if (!scores.length) return { first: 0, latest: 0, best: 0, average: 0, improvement: 0 };
  const first = scores[0];
  const latest = scores.at(-1) ?? first;
  return {
    first,
    latest,
    best: Math.max(...scores),
    average: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    improvement: latest - first,
  };
}

export function targetFor(topic: string, score: number, reviewDate: string) {
  const pathway = pathwayFor(score);
  const threshold = pathway === "Support" ? 70 : pathway === "Core" ? 75 : pathway === "Stretch" ? 85 : 90;
  return {
    pathway,
    text: `Complete the ${topic} ${pathway} practice and achieve at least ${threshold}% in the review check by ${reviewDate}.`,
    reason: `Latest recorded score: ${score}%.`,
    status: "proposed" as const,
  };
}
