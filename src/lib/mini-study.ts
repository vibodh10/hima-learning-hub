/** Shared contracts and pure rules. Answer keys live in server-side content, never the initial client payload. */
export type StudyOption = { id: string; text: string };
export type StudyQuestion = {
  id: string; skill: string; prompt: string; kind: "choice" | "match";
  options: StudyOption[]; stems?: StudyOption[]; recap?: boolean;
};
export type StudyQuestionKey = StudyQuestion & { answer: string | Record<string, string>; explanation: string };
export type StudyLesson = {
  id: string; unitCode: string; topicCode: string; title: string; skill: string;
  lines: string[]; example: string; support: string; analysis: string; evaluation: string;
  questions: StudyQuestionKey[]; sources: string[];
};
export type StudyResponse = { questionId: string; answer: string | Record<string, string> };
export type StudyFeedback = { questionId: string; correct: boolean; recap: boolean; skill: string; explanation: string; correctAnswer: string };
export type StudyGrade = { correct: number; total: number; feedback: StudyFeedback[] };
export type StudyCompletion = { lessonId: string; completedAt: string; kind: "baseline" | "daily"; feedback: StudyFeedback[] };
export type StudyCard = {
  sessionId: string; kind: "baseline" | "daily"; title: string; unitTitle: string;
  lines: string[]; example: string; support: string; thinking?: string;
  questions: StudyQuestion[];
};
export type StudyResult = { ok: false; message: string } | { ok: true; grade: StudyGrade };
export type StudyReward = { xp: number; badge: string | null; nextOn: string };

/** School-day boundaries must not depend on a learner's browser clock or timezone. */
export function studyDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}

export function nextStudyDay(day: string): string {
  const next = new Date(`${day}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0,10);
}

/** Stable within a saved session, varied between sessions. Never mutates source content. */
export function studyShuffle<T>(items: readonly T[], seed: string): T[] {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const swap = (state >>> 0) % (index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function publicStudyQuestions(keys: StudyQuestionKey[], seed: string): StudyQuestion[] {
  const recap = keys.filter(q=>q.recap);
  const fresh = studyShuffle(keys.filter(q=>!q.recap), `${seed}:questions`);
  return [...recap,...fresh].map(q=>({
    id:q.id,skill:q.skill,prompt:q.prompt,kind:q.kind,recap:q.recap,
    options:studyShuffle(q.options, `${seed}:${q.id}:options`),
    ...(q.stems ? {stems:studyShuffle(q.stems, `${seed}:${q.id}:stems`)} : {}),
  }));
}

/** Reject incomplete, extra, duplicate, unknown and malformed answers before recording anything. */
export function gradeStudy(keys: StudyQuestionKey[], input: unknown): StudyGrade | null {
  if (!Array.isArray(input) || input.length !== keys.length || !keys.length) return null;
  const answers = new Map<string, string | Record<string,string>>();
  for (const value of input) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string,unknown>;
    if (Object.keys(record).some(k=>!["questionId","answer"].includes(k))) return null;
    if (typeof record.questionId !== "string" || answers.has(record.questionId)) return null;
    const question = keys.find(q=>q.id===record.questionId);
    if (!question) return null;
    if (question.kind === "choice") {
      if (typeof record.answer !== "string" || !question.options.some(o=>o.id===record.answer)) return null;
    } else {
      if (!record.answer || typeof record.answer !== "object" || Array.isArray(record.answer)) return null;
      const pairs = record.answer as Record<string,unknown>;
      if (Object.keys(pairs).length !== question.stems?.length || !question.stems?.every(s=>Object.hasOwn(pairs,s.id))) return null;
      if (!Object.values(pairs).every(v=>typeof v==="string" && question.options.some(o=>o.id===v))) return null;
      if (new Set(Object.values(pairs)).size !== Object.keys(pairs).length) return null;
    }
    answers.set(record.questionId, record.answer as string | Record<string,string>);
  }
  const feedback = keys.map((q):StudyFeedback=>{
    const actual = answers.get(q.id);
    const correct = typeof q.answer === "string" ? actual===q.answer
      : Object.entries(q.answer).every(([stem,option])=>actual && typeof actual!=="string" && actual[stem]===option);
    const correctAnswer = typeof q.answer === "string" ? q.options.find(o=>o.id===q.answer)!.text
      : q.stems!.map(s=>`${s.text}: ${q.options.find(o=>o.id===(q.answer as Record<string,string>)[s.id])!.text}`).join("; ");
    return {questionId:q.id,skill:q.skill,correct,recap:Boolean(q.recap),explanation:q.explanation,correctAnswer};
  });
  return {correct:feedback.filter(f=>f.correct && !f.recap).length,total:feedback.filter(f=>!f.recap).length,feedback};
}

/** Use actual starting-point errors to prioritise unseen foundation ideas. Advanced reasoning follows the foundations. */
export function nextStudyLesson(lessons: StudyLesson[], history: StudyCompletion[]): StudyLesson | undefined {
  const finished = new Set(history.filter(h=>h.kind==="daily").map(h=>h.lessonId));
  const baseline = history.find(h=>h.kind==="baseline");
  const weak = new Set(baseline?.feedback.filter(f=>!f.correct).map(f=>f.skill) ?? []);
  const unseen = lessons.filter(l=>!finished.has(l.id));
  const foundations = unseen.filter(l=>!["analysis","evaluation"].includes(l.skill));
  return foundations.find(l=>weak.has(l.skill)) ?? foundations[0] ?? unseen[0];
}

export function studyQuestionSet(lesson: StudyLesson, previous?: StudyLesson): StudyQuestionKey[] {
  if (!previous) return lesson.questions;
  // Recap a specific, genuinely completed idea. Its score is separate from the new topic.
  const source = previous.questions.find(q=>q.kind==="choice");
  return source ? [{...source,id:`recap:${previous.id}:${source.id}`,recap:true,prompt:`Quick recap: ${source.prompt}`},...lesson.questions] : lesson.questions;
}

export function studyThinking(lesson: StudyLesson, baseline?: StudyGrade): string | undefined {
  if (!baseline || baseline.total===0 || baseline.correct/baseline.total < .5) return undefined;
  return baseline.correct/baseline.total >= .8 ? lesson.evaluation : lesson.analysis;
}
