import { NextResponse } from "next/server";
import { QUESTION_BANK } from "@/lib/course-entry-readiness-question-bank";
import { evaluateEligibility, type Qualification, type Student } from "@/lib/course-entry-readiness";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { student?: Student; qualifications?: Qualification[] };
    if (!body.student || !Array.isArray(body.qualifications)) return NextResponse.json({ error: "Invalid assessment request." }, { status: 400 });
    const eligibility = evaluateEligibility(body.student, body.qualifications);
    if (!["eligible", "provisionally_eligible", "qualification_verification_required"].includes(eligibility.status)) {
      return NextResponse.json({ error: "The entry criteria stage must be passed before the assessment can start.", eligibility }, { status: 403 });
    }
    const bank = QUESTION_BANK.filter((q) => q.pathway === body.student!.pathway);
    const selected = shuffle([
      ...shuffle(bank.filter((q) => q.difficulty === "easy")).slice(0, 2),
      ...shuffle(bank.filter((q) => q.difficulty === "medium")).slice(0, 5),
      ...shuffle(bank.filter((q) => q.difficulty === "hard")).slice(0, 3),
    ]);
    const questions = selected.map(({ id, pathway, category, difficulty, question, options }) => ({ id, pathway, category, difficulty, question, options }));
    return NextResponse.json({ questions, eligibility, durationSeconds: 600 });
  } catch {
    return NextResponse.json({ error: "Unable to start assessment." }, { status: 400 });
  }
}
