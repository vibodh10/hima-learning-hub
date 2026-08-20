"use client";

import { useActionState, useRef, useState } from "react";
import { submitPractice, type ActionState } from "@/app/actions/learning";

export type PracticeQuestion = {
  id: string;
  kind: string;
  question_text: string;
  marks: number;
  hint?: string | null;
  skills?: { title: string } | { title: string }[] | null;
  question_options: { id: string; option_text: string; sort_order: number }[];
};

export function PracticeForm({ activityId, questions, assessmentKind }: { activityId: string; questions: PracticeQuestion[]; assessmentKind?: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitPractice, {});
  const [revealedHints, setRevealedHints] = useState<Set<string>>(() => new Set());
  const [startedAt]=useState(()=>Date.now());
  const secondsRef=useRef<HTMLInputElement>(null);

  if (state.result) return <Result result={state.result} />;

  return <form action={action} className="grid gap-6" onSubmit={()=>{if(secondsRef.current)secondsRef.current.value=String(Math.max(1,Math.round((Date.now()-startedAt)/1000)));}}>
    <input type="hidden" name="activityId" value={activityId}/>
    <input type="hidden" name="hintsUsed" value={revealedHints.size}/>
    <input ref={secondsRef} type="hidden" name="activeSeconds" defaultValue="1"/>
    <section className="card bg-slate-50"><h2 className="text-lg font-bold">Before you begin</h2><label className="mt-3 grid gap-2 text-sm font-semibold">How confident do you feel about this topic?<select className="input" name="confidenceBefore" defaultValue="3">{[1,2,3,4,5].map(value=><option value={value} key={value}>{value} · {value===1?"not yet confident":value===5?"very confident":"developing confidence"}</option>)}</select></label>{assessmentKind&&<div className="mt-4 grid gap-3"><label className="grid gap-1 text-sm font-semibold">Relevant prior experience<textarea className="input min-h-16" name="priorExperience" placeholder="What have you studied or tried before?"/></label><label className="grid gap-1 text-sm font-semibold">Support that helps you learn<textarea className="input min-h-16" name="supportNeeds"/></label><label className="grid gap-1 text-sm font-semibold">Your course or career aspirations<textarea className="input min-h-16" name="aspirations"/></label></div>} {!assessmentKind&&<><input type="hidden" name="priorExperience" value=""/><input type="hidden" name="supportNeeds" value=""/><input type="hidden" name="aspirations" value=""/></>}</section>
    {questions.map((question, index) => <fieldset key={question.id} className="card">
      <legend className="px-2 font-bold">
        <span className="text-teal-700">Question {index + 1}</span> · {question.marks} {Number(question.marks) === 1 ? "mark" : "marks"}
      </legend>
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">{related(question.skills)?.title ?? "Applied skill"}</p>
      <p className="mt-3 whitespace-pre-wrap text-lg font-semibold">{question.question_text}</p>
      <QuestionInput question={question}/>
      {question.hint && <div className="mt-4">
        {revealedHints.has(question.id)
          ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><strong>Hint:</strong> {question.hint}</p>
          : <button className="link text-sm" type="button" onClick={() => setRevealedHints(current => new Set(current).add(question.id))}>Show a hint</button>}
      </div>}
    </fieldset>)}
    <section className="card bg-slate-50"><label className="grid gap-2 text-sm font-semibold">After completing the questions, how confident do you feel?<select className="input" name="confidenceAfter" defaultValue="3">{[1,2,3,4,5].map(value=><option value={value} key={value}>{value} · {value===1?"not yet confident":value===5?"very confident":"developing confidence"}</option>)}</select></label></section>
    {state.message && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{state.message}</p>}
    <button className="button" disabled={pending}>{pending ? "Marking and saving…" : "Submit all answers"}</button>
  </form>;
}

function QuestionInput({ question }: { question: PracticeQuestion }) {
  const name = `q_${question.id}`;
  if (question.kind === "single_choice" || question.kind === "multiple_response") {
    return <div className="mt-4 grid gap-3">{question.question_options
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(option => <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-teal-50">
        <input className="size-5 accent-teal-700" type={question.kind === "multiple_response" ? "checkbox" : "radio"} name={name} value={option.option_text} required={question.kind === "single_choice"}/>
        {option.option_text}
      </label>)}</div>;
  }
  if (question.kind === "true_false") {
    return <div className="mt-4 flex gap-4">{["True", "False"].map(value => <label key={value} className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3">
      <input type="radio" name={name} value={value.toLowerCase()} required/>{value}
    </label>)}</div>;
  }
  const codeLike = ["matching","ordering","code_output","code_completion","identify_error","correct_code","pseudocode_ordering","sql_completion","html_css_completion","javascript_completion","extended_response","reflection"].includes(question.kind);
  return <label className="mt-4 grid gap-2 text-sm font-semibold">Your answer
    {codeLike
      ? <textarea className="input min-h-28 font-mono" name={name} required spellCheck={false}/>
      : <input className="input" name={name} type={question.kind === "numeric" ? "number" : "text"} step={question.kind === "numeric" ? "any" : undefined} required/>}
  </label>;
}

function Result({ result }: { result: NonNullable<ActionState["result"]> }) {
  return <section aria-live="polite">
    <div className="card bg-teal-900 text-white">
      <p className="text-sm font-bold uppercase tracking-widest text-teal-200">Practice saved</p>
      <h2 className="mt-3 text-4xl font-bold">{result.percentage}%</h2>
      <p className="mt-2">{result.mark} of {result.maxMark} marks · {result.pathway} pathway</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {Number(result.coinsAwarded) > 0 && <span className="rounded-full bg-amber-300 px-3 py-1 text-sm font-bold text-amber-950">+{result.coinsAwarded} gold coins</span>}
        {result.badgesAwarded?.map(badge => {
          const title = typeof badge === "string" ? badge : badge.title;
          const key = typeof badge === "string" ? badge : badge.code;
          return <span key={key} className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">{title} badge</span>;
        })}
      </div>
      <a className="button-secondary mt-5" href="/dashboard">Return to dashboard</a>
    </div>
    {result.skillMastery?.length ? <div className="card mt-6">
      <h3 className="text-xl font-bold">Skill progress</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{result.skillMastery.map(skill => <div className="rounded-xl bg-slate-50 p-4" key={skill.skillId}>
        <p className="font-semibold">{skill.title}</p>
        <p className="mt-1 text-sm text-slate-600">{Math.round(Number(skill.masteryScore))}% mastery · {skill.pathway}</p>
      </div>)}</div>
    </div> : null}
    <div className="mt-6 grid gap-4">{result.feedback.map((item, index) => <article key={item.questionId} className="card">
      <p className={`font-bold ${item.correct ? "text-teal-800" : "text-amber-800"}`}>{item.correct ? "Correct" : "Review question"} {index + 1}</p>
      <p className="mt-3 leading-7 text-slate-700">{item.explanation}</p>
      {!item.correct && <p className="mt-3 text-sm"><strong>Correct answer:</strong> {formatAnswer(item.correctAnswer)}</p>}
    </article>)}</div>
  </section>;
}

function formatAnswer(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function related<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}
