"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveAtomAttempt } from "@/app/actions/atom-learning";
import {
  markQuestion,
  paperBlueprintsFor,
  paperQuestions,
  scoreQuestion,
  type LearningQuestion,
  type PaperMode,
} from "@/lib/atom-question-bank";
import type { PearsonUnit } from "@/lib/pearson-curriculum";

export function PracticePaper({ unit }: { unit: PearsonUnit }) {
  const blueprints = paperBlueprintsFor(unit);
  const [mode, setMode] = useState<PaperMode>(unit.code === "2" ? "assignment" : "applied");
  const blueprint = blueprints.find(item => item.mode === mode)!;
  const [version, setVersion] = useState(0);
  const questions = useMemo(() => paperQuestions(unit, version, mode), [unit, version, mode]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [syncPending, startSync] = useTransition();
  const [syncMessage, setSyncMessage] = useState("");
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const marks = questions.reduce((sum, question) => sum + question.marks, 0);
  const earned = questions.reduce((sum, question) => sum + scoreQuestion(question, answers[question.id] ?? ""), 0);
  const percent = Math.round(earned / marks * 100);
  const practical = questions.some(question => question.kind === "practical_response");
  const requiresReview = questions.some(question => !question.options);

  function choose(next: PaperMode) {
    setMode(next);
    setAnswers({});
    setVersion(0);
  }

  if (!started) return <div className="grid gap-6">
    <section>
      <p className="eyebrow">Choose a paper</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">{blueprints.map(item =>
        <button className={`card text-left ${mode === item.mode ? "border-teal-500 bg-teal-50" : "hover:border-teal-300"}`} onClick={() => choose(item.mode)} key={item.mode}>
          <span className="text-xs font-bold uppercase tracking-wide text-teal-800">{item.mode}</span>
          <strong className="mt-2 block text-xl">{item.title}</strong>
          <span className="mt-2 block text-sm leading-6 text-slate-600">{item.description}</span>
        </button>)}</div>
    </section>
    <section className="card max-w-3xl">
      <p className="eyebrow">{blueprint.title} · Version {version + 1}</p>
      <h2 className="mt-2 text-3xl font-bold">Unit {unit.code}: {unit.title}</h2>
      <p className="mt-4 text-slate-600">{questions.length} {practical ? "practical activities" : "questions"} · {marks} marks · suggested time {blueprint.suggestedMinutes} minutes. {practical ? "The activities cover the unit through produced database, code, design and testing evidence." : "Every topic in this unit is sampled."}</p>
      {unit.code === "2" && mode === "assignment" && <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950"><strong>External-assessment rehearsal:</strong> this is an original practice task, not a live or copied Pearson assessment. It mirrors the practical evidence pattern: database structure, queries, interface, testing and evaluation.</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="button" onClick={() => { setStartedAt(Date.now()); setStarted(true); }}>Start this paper</button>
        <button className="button-secondary" onClick={() => setVersion(value => value + 1)}>Generate a fresh version</button>
      </div>
    </section>
  </div>;

  return <div className="grid gap-5">
    <div className="card sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 py-4">
      <div><strong>{blueprint.title}</strong><p className="text-sm text-slate-600">{Object.keys(answers).length}/{questions.length} answered · suggested {blueprint.suggestedMinutes} min</p></div>
      {!submitted && <button className="button" onClick={finish}>Finish and mark</button>}
      {submitted && <strong className="text-2xl">{requiresReview ? "Awaiting teacher review" : `${percent}% · ${earned}/${marks}`}</strong>}
    </div>
    {questions.map((question, index) => <QuestionField key={question.id} question={question} index={index} answer={answers[question.id] ?? ""} submitted={submitted} onAnswer={answer => setAnswers(current => ({ ...current, [question.id]: answer }))}/>)}
    {submitted && <section className="card text-center">
      <h2 className="text-3xl font-bold">{requiresReview ? "Paper submitted for review" : `Paper complete: ${percent}%`}</h2>
      <p className="mt-2 text-slate-600">{requiresReview ? "A teacher will review the written or practical evidence against the mark scheme before a final mark appears in reports." : "Review the mark schemes above, then generate a comparable version or revisit the topics that need development."}</p>
      {(syncPending || syncMessage) && <p role="status" className="mt-4 rounded-xl bg-slate-100 p-3 text-sm">{syncPending ? "Adding this paper to your report…" : syncMessage}</p>}
      <div className="mt-5 flex justify-center gap-3">
        <button className="button" onClick={() => { setVersion(value => value + 1); setAnswers({}); setSubmitted(false); setStarted(false); setStartedAt(Date.now()); setSyncMessage(""); }}>New comparable paper</button>
        <Link className="button-secondary" href="/progress">View progress</Link>
      </div>
    </section>}
  </div>;

  function finish() {
    setSubmitted(true);
    startSync(async () => {
      const response = await saveAtomAttempt({
        kind: "practice_paper", unitCode: unit.code, topicCode: null, paperMode: mode,
        paperVersion: version,
        activeSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        responses: questions.map(question => ({ id: question.id, hintsUsed: 0, answer: answers[question.id] ?? "" })),
      });
      setSyncMessage(response.message);
    });
  }
}

function QuestionField({ question, index, answer, submitted, onAnswer }: { question: LearningQuestion; index: number; answer: string; submitted: boolean; onAnswer: (answer: string) => void }) {
  const correct = markQuestion(question, answer);
  return <fieldset className="card">
    <legend className="px-2 font-bold">{question.kind === "practical_response" ? "Activity" : "Question"} {index + 1} · {question.commandWord} · {question.marks} marks</legend>
    <p className="mt-3 whitespace-pre-line text-lg font-semibold">{question.prompt}</p>
    {question.starterCode && <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Starter code / structure</p><pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-50"><code>{question.starterCode}</code></pre></div>}
    {question.evidenceChecklist && <div className="mt-4 rounded-xl bg-blue-50 p-4"><p className="text-sm font-bold text-blue-950">Evidence your response should contain</p><ul className="mt-2 grid gap-1 text-sm text-blue-950">{question.evidenceChecklist.map(item => <li key={item}>□ {item}</li>)}</ul></div>}
    {question.options ? <div className="mt-4 grid gap-2">{question.options.map((option, optionIndex) => <label className="rounded-xl border border-slate-200 p-3" key={option}><input disabled={submitted} className="mr-3" type="radio" name={question.id} checked={answer === String(optionIndex)} onChange={() => onAnswer(String(optionIndex))}/>{option}</label>)}</div> : <>
      <textarea disabled={submitted} spellCheck={question.responseFormat === "written"} className={`input mt-4 ${question.kind === "practical_response" ? "min-h-72 font-mono" : "min-h-36"}`} placeholder={question.kind === "practical_response" ? `Produce the requested ${formatLabel(question.responseFormat)} evidence here.` : `Aim for at least ${question.minimumWords} words.`} value={answer} onChange={event => onAnswer(event.target.value)}/>
      <p className="mt-2 text-xs text-slate-500">{question.kind === "practical_response" ? "Paste or write the design, SQL, code or test evidence. This is not automatically graded: a teacher awards the final mark against the published rubric." : `Indicative minimum ${question.minimumWords} words. Extended responses receive automated guidance and remain available for teacher review.`}</p>
    </>}
    {submitted && <div className={`mt-4 rounded-xl p-4 ${question.kind === "practical_response" ? "bg-blue-50" : correct ? "bg-teal-50" : "bg-amber-50"}`}>
      <strong>{question.kind === "practical_response" ? "Awaiting teacher mark" : question.options ? (correct ? "Correct" : "Review this") : (correct ? "Key evidence found" : "More development needed")}</strong>
      <p className="mt-1 text-sm">{question.explanation}</p>
      <details className="mt-3 rounded-xl bg-white/70 p-3"><summary className="cursor-pointer font-bold">Mark scheme and model response</summary><ul className="mt-2 grid gap-1 text-sm">{question.markScheme.map(point => <li key={point}>□ {point}</li>)}</ul><p className="mt-3 whitespace-pre-line text-sm"><strong>Model:</strong> {question.modelAnswer}</p>{question.kind !== "practical_response" && !correct && <p className="mt-2 text-sm"><strong>Watch for:</strong> {question.misconception}</p>}</details>
    </div>}
  </fieldset>;
}

function formatLabel(value: LearningQuestion["responseFormat"]) {
  return (value ?? "written").replaceAll("_", "/");
}
