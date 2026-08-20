import { NextResponse } from "next/server";
import { QUESTION_BANK } from "@/lib/course-entry-readiness-question-bank";
import { evaluateEligibility, type Qualification, type Student } from "@/lib/course-entry-readiness";

function bandFor(score: number) {
  if (score >= 8) return "Strong Readiness";
  if (score >= 6) return "Ready";
  if (score >= 4) return "Borderline: Tutor Review Recommended";
  return "Not Yet Ready";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { student?: Student; qualifications?: Qualification[]; questionIds?: string[]; answers?: Record<string, number> };
    if (!body.student || !Array.isArray(body.qualifications) || !Array.isArray(body.questionIds) || !body.answers) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    const eligibility = evaluateEligibility(body.student, body.qualifications);
    if (!["eligible", "provisionally_eligible", "qualification_verification_required"].includes(eligibility.status)) return NextResponse.json({ error: "Eligibility could not be confirmed for this assessment.", eligibility }, { status: 403 });
    const uniqueIds = [...new Set(body.questionIds)].slice(0, 10);
    if (uniqueIds.length !== 10) return NextResponse.json({ error: "Assessment must contain exactly 10 questions." }, { status: 400 });
    const questions = uniqueIds.map((id) => QUESTION_BANK.find((q) => q.id === id && q.pathway === body.student!.pathway)).filter(Boolean);
    if (questions.length !== 10) return NextResponse.json({ error: "One or more questions are invalid for this pathway." }, { status: 400 });
    let score = 0;
    const categoryScores: Record<string, { correct: number; total: number }> = {};
    const review = questions.map((q) => {
      if (!q) throw new Error("Invalid question");
      if (!categoryScores[q.category]) categoryScores[q.category] = { correct: 0, total: 0 };
      categoryScores[q.category].total++;
      const selected = body.answers![q.id];
      const isCorrect = Number.isInteger(selected) && selected === q.correct;
      if (isCorrect) { score++; categoryScores[q.category].correct++; }
      return { id: q.id, question: q.question, category: q.category, selected, yourAnswer: Number.isInteger(selected) ? q.options[selected] : "Unanswered", correctAnswer: q.options[q.correct], explanation: q.explanation, isCorrect };
    });
    const unanswered = review.filter((r) => !Number.isInteger(r.selected)).length;
    return NextResponse.json({ score, percentage: score * 10, band: bandFor(score), unanswered, categoryScores, review, eligibility });
  } catch {
    return NextResponse.json({ error: "Unable to mark assessment." }, { status: 400 });
  }
}
