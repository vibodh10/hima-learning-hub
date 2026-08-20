import { NextResponse } from "next/server";
import { evaluateEligibility, type Qualification, type Student } from "@/lib/course-entry-readiness";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { student?: Student; qualifications?: Qualification[] };
    if (!body.student || !Array.isArray(body.qualifications)) return NextResponse.json({ error: "Invalid eligibility request." }, { status: 400 });
    return NextResponse.json(evaluateEligibility(body.student, body.qualifications));
  } catch {
    return NextResponse.json({ error: "Unable to check eligibility." }, { status: 400 });
  }
}
