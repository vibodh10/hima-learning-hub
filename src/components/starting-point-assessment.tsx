"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveStartingPoint } from "@/app/actions/curriculum";
import { diagnosticQuestionsFor, expertiseFromEvidence, type SkillEvidence } from "@/lib/adaptive-workbook";
import { topicKey, type LearningProgress } from "@/lib/learning-progress";
import type { PearsonUnit } from "@/lib/pearson-curriculum";
import { metaForUnit } from "@/lib/learning-catalog";

export function StartingPointAssessment({ unit, storageKey }: { unit: PearsonUnit; storageKey: string }) {
  const questions = useMemo(() => diagnosticQuestionsFor(unit), [unit]);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [evidence, setEvidence] = useState<SkillEvidence[]>([]);
  const [complete, setComplete] = useState(false);
  const [experience, setExperience] = useState("");
  const [supportNeeds, setSupportNeeds] = useState("");
  const [syncPending, startSync] = useTransition();
  const [syncMessage, setSyncMessage] = useState("");
  const [started, setStarted] = useState(false);
  const question = questions[index];

  function answer() {
    if (choice == null || !question) return;
    const item: SkillEvidence = {
      id: `${question.id}:${Date.now()}`,
      kind: "initial_diagnostic",
      unitCode: unit.code,
      topicCode: question.topicCode,
      skill: question.skill,
      learningAim: metaForUnit(unit.code).aims.find(aim => aim.startsWith(question.topicCode.charAt(0))) ?? metaForUnit(unit.code).aims[0],
      criterion: metaForUnit(unit.code).criteria[0],
      difficulty: question.difficulty,
      correct: choice === question.answer,
      independent: true,
      hintsUsed: 0,
      ...(choice === question.answer ? {} : { misconception: question.misconception }),
      feedback: question.explanation,
      recordedAt: new Date().toISOString(),
    };
    const nextEvidence = [...evidence, item];
    setEvidence(nextEvidence);
    setChoice(null);
    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }
    const savedAt = new Date().toISOString();
    let current: LearningProgress = { topics: {} };
    try { current = JSON.parse(localStorage.getItem(storageKey) ?? "") as LearningProgress; } catch { /* first use */ }
    const topics = { ...current.topics };
    for (const topic of unit.topics) {
      const key = topicKey(unit.code, topic.code);
      const topicEvidence = nextEvidence.filter(entry => entry.topicCode === topic.code);
      topics[key] = { ...(topics[key] ?? {}), evidence: [...(topics[key]?.evidence ?? []).filter(entry => entry.kind !== "initial_diagnostic"), ...topicEvidence] };
    }
    const next: LearningProgress = {
      ...current,
      recommendedLevel: expertiseFromEvidence(nextEvidence),
      diagnosticCompletedAt: savedAt,
      background: { ...(current.background ?? {}), experience, supportNeeds },
      topics,
    };
    localStorage.setItem(storageKey, JSON.stringify(next));
    startSync(async () => {
      const result = await saveStartingPoint({ unitCode: unit.code, level: next.recommendedLevel!, background: { experience, supportNeeds }, evidence: nextEvidence });
      setSyncMessage(result.message);
    });
    setComplete(true);
  }

  if (complete) {
    const level = expertiseFromEvidence(evidence);
    const correct = evidence.filter(item => item.correct).length;
    return <div className="grid gap-6">
      <section className="card border-teal-300 bg-teal-50"><p className="eyebrow">Starting point complete</p><h2 className="mt-2 text-3xl font-bold">Recommended route: {level}</h2><p className="mt-3">You answered {correct} of {evidence.length} independent questions correctly. Each topic decision uses three mapped questions; mixed evidence creates a review route rather than a skip.</p></section>
      <section className="card"><h2 className="text-xl font-bold">What happens next</h2><p className="mt-3 text-slate-600">Secure topics may be fast-tracked with a recorded reason and later retrieval check. Mandatory learning aims, assignments and project evidence are never removed, and every topic remains available for revision.</p><p role="status" className="mt-3 text-sm font-semibold">{syncPending ? "Syncing evidence…" : syncMessage}</p><Link className="button mt-5" href={`/curriculum/units/${unit.code}`}>Open your adaptive pathway →</Link></section>
    </div>;
  }

  if (!started) {
    return <div className="grid gap-6">
      <section className="card border-blue-200 bg-blue-50"><p className="eyebrow">Academic diagnostic</p><h2 className="mt-2 text-2xl font-bold">Show what you can do now</h2><p className="mt-3">This assessment contains {questions.length} questions: three independent questions for every topic. It recommends a route but does not complete mandatory assignments.</p></section>
      <section className="card"><h2 className="text-xl font-bold">Background (stored separately)</h2><p className="mt-2 text-sm text-slate-600">These answers help staff understand you but never count as mastery.</p><label className="mt-4 block font-semibold">Previous experience<textarea className="input mt-2 min-h-24" value={experience} onChange={event => setExperience(event.target.value)}/></label><label className="mt-4 block font-semibold">Support or accessibility needs<textarea className="input mt-2 min-h-24" value={supportNeeds} onChange={event => setSupportNeeds(event.target.value)}/></label><button className="button mt-5" type="button" onClick={() => setStarted(true)}>Start question 1 →</button></section>
    </div>;
  }

  return <AssessmentQuestion question={question} choice={choice} setChoice={setChoice} submit={answer} position={index + 1} total={questions.length}/>;
}

function AssessmentQuestion({ question, choice, setChoice, submit, position, total }: { question: ReturnType<typeof diagnosticQuestionsFor>[number]; choice: number | null; setChoice: (value: number) => void; submit: () => void; position: number; total: number }) {
  return <section className="card"><div className="flex justify-between gap-4 text-sm"><strong>Question {position} of {total}</strong><span>Topic {question.topicCode} · difficulty {question.difficulty}</span></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-600" style={{ width: `${(position / total) * 100}%` }}/></div><h2 className="mt-6 text-2xl font-bold">{question.prompt}</h2><div className="mt-5 grid gap-3">{question.options.map((option, optionIndex) => <label className={`rounded-xl border p-4 ${choice === optionIndex ? "border-teal-600 bg-teal-50" : "border-slate-200"}`} key={option}><input className="mr-3" type="radio" checked={choice === optionIndex} onChange={() => setChoice(optionIndex)}/>{option}</label>)}</div><button className="button mt-5" disabled={choice == null} type="button" onClick={submit}>Save answer and continue</button><p className="mt-3 text-xs text-slate-500">No hints are available because this is independent starting-point evidence.</p></section>;
}
