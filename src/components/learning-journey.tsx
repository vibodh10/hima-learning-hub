"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveCurriculumProgress } from "@/app/actions/curriculum";
import {
  expertiseLevels,
  lessonFor,
  metaForUnit,
  recommendedLevel,
  topicHref,
  type ExpertiseLevel,
} from "@/lib/learning-catalog";
import {
  progressKey,
  projectReady,
  routeForTopic,
  topicKey,
  type LearningProgress,
  type TopicEvidence,
} from "@/lib/learning-progress";
import { academicProgress, levelChoiceWarning, visualPathStatuses, type SkillEvidence } from "@/lib/adaptive-workbook";
import type { PearsonTopic, PearsonUnit } from "@/lib/pearson-curriculum";

const emptyProgress: LearningProgress = { topics: {} };

function useProgress(initialProgress: LearningProgress | null = null, storageKey = progressKey) {
  const [progress, setProgress] = useState<LearningProgress>(initialProgress ?? emptyProgress);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      if (initialProgress) {
        setProgress(initialProgress);
        return;
      }
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const local = JSON.parse(saved) as LearningProgress;
        setProgress({
          ...local,
          topics: local.topics ?? {},
        });
      }
    } finally {
      setLoaded(true);
    }
  }, [initialProgress, storageKey]);
  function update(change: (current: LearningProgress) => LearningProgress) {
    let current = progress;
    if (!initialProgress) try {
      current = JSON.parse(localStorage.getItem(storageKey) ?? "") as LearningProgress;
    } catch {
      // The in-memory state is the safe fallback when no saved state exists yet.
    }
    const next = change(current);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setProgress(next);
    return next;
  }
  return { progress, update, loaded };
}

function evidenceFor(progress: LearningProgress, unit: string, topic: string) {
  return progress.topics[topicKey(unit, topic)] ?? {};
}

export function CourseWorkbookProgress({ units, initialProgress = null, storageKey = progressKey }: { units: PearsonUnit[]; initialProgress?: LearningProgress | null; storageKey?: string }) {
  const { progress, loaded } = useProgress(initialProgress, storageKey);
  const decisions = units.flatMap(unit => unit.topics.map(topic => routeForTopic(evidenceFor(progress, unit.code, topic.code))));
  const counts = (status: string) => decisions.filter(item => item.status === status).length;
  const current = progress.currentPosition;
  return <section className="card mt-8 border-teal-200 bg-teal-50"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Academic progress</p><h2 className="mt-2 text-3xl font-bold">{loaded ? `${academicProgress(decisions)}% of modules independently secure` : "Loading your evidence…"}</h2><p className="mt-2 text-sm text-slate-700">Page views, coins, badges and self-reported experience do not increase this figure.</p></div>{current && <Link className="button" href={topicHref(current.unitCode, current.topicCode)}>Continue Unit {current.unitCode} · {current.topicCode} →</Link>}</div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ProgressFact label="Independently mastered" value={counts("Independently mastered")}/><ProgressFact label="Fast-tracked" value={counts("Fast-tracked through diagnostic evidence")}/><ProgressFact label="Support required" value={counts("Support required")}/><ProgressFact label="Retrieval due" value={counts("Retrieval due")}/></div></section>;
}

function ProgressFact({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }

export function UnitOverview({ unit, initialProgress = null, storageKey = progressKey }: { unit: PearsonUnit; initialProgress?: LearningProgress | null; storageKey?: string }) {
  const { progress, loaded } = useProgress(initialProgress, storageKey);
  const meta = metaForUnit(unit.code);
  const readiness = projectReady(progress, unit.code, unit.topics.map(item => item.code));
  const decisions = unit.topics.map(topic => routeForTopic(evidenceFor(progress, unit.code, topic.code)));
  const pathStatuses = visualPathStatuses(decisions);
  const unitProgress = academicProgress(decisions);
  return <div>
    <section className="card mb-6 border-violet-200 bg-violet-50"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Test</p><h2 className="mt-2 text-2xl font-bold">Unit {unit.code} practice papers</h2><p className="mt-2 text-sm text-slate-700">Mixed questions from every topic, instant marking and worked explanations.</p></div><Link className="button" href={`/curriculum/units/${unit.code}/papers`}>Choose a paper →</Link></div></section>
    <section className="card mb-6 border-blue-200 bg-blue-50"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Adaptive starting point</p><h2 className="mt-2 text-2xl font-bold">{progress.diagnosticCompletedAt ? "Your evidence-based route is ready" : "Complete this before receiving a recommended route"}</h2><p className="mt-2 text-sm text-slate-700">Three independent questions per topic are used. Self-reported experience is stored separately.</p></div><Link className="button" href={`/curriculum/units/${unit.code}/starting-point`}>{progress.diagnosticCompletedAt ? "Retake starting point" : "Start assessment"} →</Link></div></section>
    <section className="card mb-6"><div className="flex justify-between gap-4"><div><p className="eyebrow">Workbook progress</p><h2 className="mt-2 text-2xl font-bold">Unit {unit.code}: {unitProgress}% independently secure</h2></div><strong>{decisions.filter(item => item.status === "Independently mastered").length}/{unit.topics.length} mastered</strong></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${unitProgress}%` }}/></div></section>
    <section className="grid gap-4 md:grid-cols-2">
      <div className="card"><p className="eyebrow">Pearson learning aims</p><ul className="mt-4 grid gap-2 text-sm">{meta.aims.map(aim => <li key={aim}>✓ {aim}</li>)}</ul></div>
      <div className="card"><p className="eyebrow">Assessment criteria</p><ul className="mt-4 grid gap-2 text-sm">{meta.criteria.map(criterion => <li key={criterion}>✓ {criterion}</li>)}</ul></div>
    </section>
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Modules</p><h2 className="mt-2 text-3xl font-bold">Choose a learning module</h2><p className="mt-2 text-sm text-slate-600">Each module follows an official Pearson topic and contains short lesson cards, practice and mastery evidence.</p></div><span className="text-sm text-slate-500">{unit.topics.length} modules</span></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{unit.topics.map((topic, index) => {
        const evidence = evidenceFor(progress, unit.code, topic.code);
        const pathStatus = pathStatuses[index];
        const status = !loaded ? "Loading progress…" : evidence.masteryScore != null ? `Mastery ${evidence.masteryScore}%` : evidence.lessonCompletedAt ? "Lesson complete · mastery due" : evidence.startedAt ? "In progress" : "Not started";
        return <Link href={topicHref(unit.code, topic.code)} className="card group hover:border-teal-400 hover:bg-teal-50" key={topic.code}>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Module {index + 1} · Pearson topic {topic.code}</p>
          <h3 className="mt-2 text-xl font-bold group-hover:text-teal-800">{topic.title}</h3>
          <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-bold">{pathStatus}</span>
          <p className="mt-2 text-sm text-slate-600">{topic.content.slice(0, 3).join(" · ")}</p>
          <p className="mt-4 text-sm font-semibold">{status} →</p>
        </Link>;
      })}</div>
    </section>
    <section className="card mt-8 border-violet-200 bg-violet-50">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Challenge project</p><h2 className="mt-2 text-2xl font-bold">{meta.project.title}</h2><p className="mt-3 max-w-3xl text-slate-700">{meta.project.scenario}</p></div><span className={`rounded-full px-3 py-2 text-sm font-bold ${readiness.ready ? "bg-teal-100 text-teal-900" : "bg-amber-100 text-amber-950"}`}>{readiness.ready ? "Ready to begin" : `${readiness.missing.length} modules to master`}</span></div>
      <p className="mt-4 text-sm"><strong>Readiness:</strong> {readiness.percentage}% · <strong>Skills used:</strong> {unit.topics.map(item => item.title).join(", ")}</p>
      {!readiness.ready && <div className="mt-4"><p className="text-sm font-bold">Missing prerequisites</p><div className="mt-2 flex flex-wrap gap-2">{readiness.missing.map(code => { const item = unit.topics.find(topic => topic.code === code); return <Link className="link rounded-full bg-white px-3 py-2 text-sm" href={topicHref(unit.code, code)} key={code}>Learn {item?.title ?? code}</Link>; })}</div></div>}
      <Link className="button mt-5" href={`/curriculum/units/${unit.code}/project`}>{readiness.ready ? "Open project" : "Preview project"} →</Link>
    </section>
  </div>;
}

export function TopicLesson({ unit, topic, previousTopic, nextTopic, initialProgress = null, storageKey = progressKey }: { unit: PearsonUnit; topic: PearsonTopic; previousTopic?: PearsonTopic; nextTopic?: PearsonTopic; initialProgress?: LearningProgress | null; storageKey?: string }) {
  const { progress, update, loaded } = useProgress(initialProgress, storageKey);
  const [syncPending, startSync] = useTransition();
  const key = topicKey(unit.code, topic.code);
  const evidence = progress.topics[key] ?? {};
  const systemRecommendation = evidence.masteryScore == null
    ? progress.recommendedLevel ?? recommendedLevel(null)
    : recommendedLevel(evidence.masteryScore);
  const level = progress.level ?? systemRecommendation;
  const lesson = useMemo(() => lessonFor(unit, topic, level), [unit, topic, level]);
  const routeDecision = routeForTopic(evidence);
  const masteryPrompt = lesson.mastery.comparablePrompts[(evidence.independentAttempts ?? 0) % lesson.mastery.comparablePrompts.length];
  const [knowledgeChoice, setKnowledgeChoice] = useState<number | null>(null);
  const [knowledgeChecked, setKnowledgeChecked] = useState(false);
  const [practiceText, setPracticeText] = useState("");
  const [masteryText, setMasteryText] = useState("");
  const [retrievalText, setRetrievalText] = useState("");
  const [hintShown, setHintShown] = useState(false);
  const [message, setMessage] = useState("");

  function sync(next: LearningProgress) {
    const nextEvidence = next.topics[key] ?? {};
    startSync(async () => {
      const result = await saveCurriculumProgress({
        unitCode: unit.code, topicCode: topic.code,
        currentSection: nextEvidence.currentSection ?? "lesson:1",
      });
      if (!result.ok) setMessage(result.message);
    });
  }

  useEffect(() => {
    if (!loaded || evidence.startedAt) return;
    const next = update(current => {
      const currentEvidence = current.topics[key] ?? {};
      if (currentEvidence.startedAt) return current;
      return { ...current, currentPosition: { unitCode: unit.code, topicCode: topic.code, section: "teaching" }, topics: { ...current.topics, [key]: { ...currentEvidence, startedAt: new Date().toISOString(), currentSection: "teaching" } } };
    });
    sync(next);
    // The first render records entry once; update is intentionally omitted from dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, key]);

  function chooseLevel(next: ExpertiseLevel) {
    const updated = update(current => ({ ...current, level: next }));
    sync(updated);
    setMessage(levelChoiceWarning(next, systemRecommendation) ?? `${next} level saved for this browser.`);
  }
  function completeLesson() {
    const updated = update(current => {
      const nextEvidence: TopicEvidence = { ...(current.topics[key] ?? {}), lessonCompletedAt: new Date().toISOString() };
      return { ...current, topics: { ...current.topics, [key]: nextEvidence } };
    });
    sync(updated);
    setMessage("Lesson completion saved. Independent mastery is still required.");
  }
  function savePractice() {
    if (practiceText.trim().length < 40) { setMessage("Add a fuller response: identify the need, decision and success check."); return; }
    const score = Math.min(100, 60 + Math.floor(practiceText.trim().length / 20));
    const updated = update(current => {
      const previous = current.topics[key] ?? {};
      const item: SkillEvidence = { id: `${key}:practice:${Date.now()}`, kind: "independent_practice", unitCode: unit.code, topicCode: topic.code, skill: topic.title, learningAim: metaForUnit(unit.code).aims.find(aim => aim.startsWith(topic.code.charAt(0))), criterion: metaForUnit(unit.code).criteria[0], difficulty: level === "Challenge" ? 4 : level === "Stretch" ? 3 : level === "Core" ? 2 : 1, correct: score >= 70, independent: !hintShown, hintsUsed: hintShown ? 1 : 0, feedback: score >= 70 ? "The response identifies a decision and a success check." : "Review teaching Part 3, identify the requirement, then justify the decision with a measurable check.", recordedAt: new Date().toISOString() };
      const nextEvidence: TopicEvidence = { ...previous, practiceScore: score, hintsUsed: hintShown ? 1 : 0, evidence: [...(previous.evidence ?? []), item] };
      return { ...current, topics: { ...current.topics, [key]: nextEvidence } };
    });
    sync(updated);
    setMessage(hintShown ? `Supported practice saved at ${score}%. Because a hint was used, it does not count as independent mastery evidence.` : `Independent practice saved at ${score}%. Feedback: your response has enough detail to move to the mastery check.`);
  }
  function submitMastery() {
    let latestEvidence = evidence;
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "") as LearningProgress;
      latestEvidence = stored.topics[key] ?? latestEvidence;
    } catch {
      // The in-memory evidence remains the safe fallback when storage is unavailable.
    }
    if (!latestEvidence.lessonCompletedAt || latestEvidence.practiceScore == null) { setMessage("Complete the lesson and guided/independent practice before the mastery check."); return; }
    const accurateTerms = topic.content.filter(term => masteryText.toLowerCase().includes(term.split(" ")[0].toLowerCase())).length;
    const hasEvidence = /\b(test|evidence|result|because|requirement|feedback)\b/i.test(masteryText);
    const score = Math.min(100, 45 + accurateTerms * 10 + (hasEvidence ? 15 : 0) + (masteryText.length >= 220 ? 10 : 0));
    const updated = update(current => {
      const previous = current.topics[key] ?? {};
      const existingAttempts = (previous.evidence ?? []).filter(item => item.kind === "topic_mastery").length;
      const item: SkillEvidence = { id: `${key}:mastery:${Date.now()}`, kind: "topic_mastery", unitCode: unit.code, topicCode: topic.code, skill: topic.title, learningAim: metaForUnit(unit.code).aims.find(aim => aim.startsWith(topic.code.charAt(0))), criterion: metaForUnit(unit.code).criteria[0], difficulty: level === "Challenge" ? 4 : level === "Stretch" ? 3 : 2, correct: score >= 70, independent: true, hintsUsed: 0, ...(score >= 70 ? {} : { misconception: `Insufficient application or justification in ${topic.title.toLowerCase()}` }), feedback: score >= 70 ? "This attempt meets the response criteria." : "Review teaching Part 3 and the worked example, then state the requirement, correct approach, evidence and justified conclusion.", recordedAt: new Date().toISOString() };
      const attemptCount = existingAttempts + 1;
      const evidenceItems = [...(previous.evidence ?? []), item];
      const masteryItems = evidenceItems.filter(entry => entry.kind === "topic_mastery" && entry.independent && entry.hintsUsed === 0);
      const masteryScore = Math.round((masteryItems.filter(entry => entry.correct).length / masteryItems.length) * 100);
      const independentlySecure = masteryItems.length >= 3 && masteryScore >= 80;
      const nextEvidence: TopicEvidence = { ...previous, masteryScore: attemptCount >= 3 ? masteryScore : previous.masteryScore, independentAttempts: attemptCount, evidence: evidenceItems, ...(independentlySecure ? { masteredAt: new Date().toISOString(), retrievalDueAt: new Date(Date.now() + 14 * 86_400_000).toISOString() } : {}) };
      return { ...current, topics: { ...current.topics, [key]: nextEvidence } };
    });
    sync(updated);
    const attemptCount = (updated.topics[key]?.independentAttempts ?? 0);
    const secure = attemptCount >= 3 && (updated.topics[key]?.masteryScore ?? 0) >= 80;
    setMessage(secure ? `Independent mastery confirmed across ${attemptCount} attempts. Retrieval is scheduled in 14 days.` : score >= 70 ? `Correct independent evidence recorded (${attemptCount}/3 minimum attempts). Complete another comparable check; one answer cannot award mastery.` : `Not secure yet. Review the teaching section: state the requirement, correct approach, evidence and justification, then try a comparable check.`);
  }
  function submitRetrieval() {
    if (retrievalText.trim().length < 120) { setMessage("Add a complete independent response before submitting the retrieval check."); return; }
    const accurateTerms = topic.content.filter(term => retrievalText.toLowerCase().includes(term.split(" ")[0].toLowerCase())).length;
    const correct = accurateTerms >= 2 && /\b(because|evidence|test|result|requirement)\b/i.test(retrievalText);
    const updated = update(current => {
      const previous = current.topics[key] ?? {};
      const item: SkillEvidence = { id: `${key}:retrieval:${Date.now()}`, kind: "retrieval", unitCode: unit.code, topicCode: topic.code, skill: topic.title, learningAim: metaForUnit(unit.code).aims.find(aim => aim.startsWith(topic.code.charAt(0))), criterion: metaForUnit(unit.code).criteria[0], difficulty: 3, correct, independent: true, hintsUsed: 0, ...(correct ? {} : { misconception: `Retrieval gap in ${topic.title.toLowerCase()}` }), feedback: correct ? "The delayed response retained accurate knowledge and application." : "Retention is not secure. Review teaching Part 2, then complete a new comparable retrieval question.", recordedAt: new Date().toISOString() };
      return { ...current, topics: { ...current.topics, [key]: { ...previous, evidence: [...(previous.evidence ?? []), item] } } };
    });
    sync(updated); setRetrievalText("");
    const count = (updated.topics[key]?.evidence ?? []).filter(item => item.kind === "retrieval").length;
    setMessage(correct ? `Retrieval evidence recorded (${count}/3).` : "Retrieval gap recorded. Review teaching Part 2 and try the next comparable question.");
  }

  return <div className="grid gap-8">
    <nav className="card" aria-label="Workbook navigation"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Workbook contents</p><p className="mt-1 font-bold">Current position: Unit {unit.code} · {topic.code} {topic.title}</p><p className="mt-1 text-sm text-slate-600">Topic {unit.topics.findIndex(item => item.code === topic.code) + 1} of {unit.topics.length} · Unit progress is based on independent evidence.</p></div><div className="flex flex-wrap gap-2">{previousTopic && <Link className="button-secondary" href={topicHref(unit.code, previousTopic.code)}>← Previous topic</Link>}<Link className="button-secondary" href={`/curriculum/units/${unit.code}`}>Workbook contents</Link>{nextTopic && <Link className="button" href={topicHref(unit.code, nextTopic.code)}>Save and continue →</Link>}</div></div></nav>
    <section className="card border-blue-200 bg-blue-50">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Expertise and route</p><h2 className="mt-2 text-2xl font-bold">Choose how you learn</h2><p className="mt-2 text-sm text-slate-700">Recommended from current evidence: <strong>{systemRecommendation}</strong>. Your saved choice: <strong>{level}</strong>.</p></div><span className="rounded-full bg-white px-3 py-2 text-sm font-bold">{evidence.masteryScore == null ? "No independent score yet" : `${evidence.masteryScore}% mastery evidence`}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{expertiseLevels.map(item => <button type="button" onClick={() => chooseLevel(item)} className={`rounded-xl border p-4 text-left ${level === item ? "border-teal-600 bg-white" : "border-blue-200"}`} key={item}><strong>{item}</strong><span className="mt-1 block text-xs text-slate-600">{item === "Support" ? "Small steps, extra examples, guidance and hints" : item === "Core" ? "Standard teaching with balanced guidance" : item === "Stretch" ? "Less scaffolding and transfer to unfamiliar contexts" : "Advanced synoptic application and project readiness"}</span></button>)}</div>
    </section>
    {routeDecision.status === "Retrieval due" && <section className="card border-teal-300 bg-teal-50"><p className="eyebrow">Delayed retrieval check</p><h2 className="mt-2 text-2xl font-bold">Confirm that the learning has been retained</h2><p className="mt-3">Without reopening the worked example, apply {topic.title.toLowerCase()} to a new organisation. Explain the requirement, decision, evidence and result. Three new comparable responses are required.</p><textarea className="input mt-4 min-h-36 bg-white" value={retrievalText} onChange={event=>setRetrievalText(event.target.value)} aria-label="Retrieval response"/><button className="button mt-4" type="button" onClick={submitRetrieval}>Submit retrieval evidence</button></section>}

    <section className="card bg-teal-950 text-white"><p className="text-sm font-bold uppercase tracking-widest text-teal-200">What you will learn</p><ul className="mt-4 grid gap-2">{lesson.objectives.map(item => <li key={item}>✓ {item}</li>)}</ul></section>

    <section><p className="eyebrow">Teach first</p><h2 className="mt-2 text-3xl font-bold">Clear explanation</h2><div className="mt-5 grid gap-4">{lesson.explanation.map((paragraph, index) => <div className="card" key={paragraph}><p className="text-xs font-bold uppercase tracking-wide text-teal-700" id={`teaching-part-${index + 1}`}>Part {index + 1}</p><p className="mt-3 leading-7">{paragraph}</p>{level === "Support" && index === 1 ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm"><strong>Pause and check:</strong> Can you explain the first two concepts in your own words?</p> : null}</div>)}</div></section>

    <section className="card"><p className="eyebrow">Key terminology</p><dl className="mt-5 grid gap-4 sm:grid-cols-2">{lesson.terms.map(item => <div className="rounded-xl bg-slate-50 p-4" key={item.term}><dt className="font-bold">{item.term}</dt><dd className="mt-2 text-sm leading-6 text-slate-600">{item.meaning}</dd></div>)}</dl></section>

    <section><p className="eyebrow">Worked example</p><h2 className="mt-2 text-3xl font-bold">See the process step by step</h2><article className="card mt-5"><p className="font-semibold">{lesson.example.scenario}</p><ol className="mt-5 grid gap-3">{lesson.example.steps.map((step, index) => <li className="rounded-xl bg-slate-50 p-4" key={step}><strong>{index + 1}.</strong> {step}</li>)}</ol>{lesson.codeExample && <div className="mt-5"><p className="text-sm font-bold text-teal-700">{lesson.codeExample.language} example</p><pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-slate-50"><code>{lesson.codeExample.code}</code></pre><p className="mt-3 text-sm text-slate-600">{lesson.codeExample.caption}</p></div>}<p className="mt-5 rounded-xl bg-teal-50 p-4"><strong>Result:</strong> {lesson.example.result}</p></article></section>

    <section className="card border-amber-200 bg-amber-50"><p className="eyebrow">Common mistakes</p><ul className="mt-4 grid gap-2">{lesson.mistakes.map(item => <li key={item}>⚠ {item}</li>)}</ul></section>

    <section className="card"><p className="eyebrow">Guided practice</p><h2 className="mt-2 text-2xl font-bold">{lesson.guided.task}</h2><ol className="mt-4 grid gap-2 text-sm">{lesson.guided.steps.map((step, index) => <li key={step}><strong>{index + 1}.</strong> {step}</li>)}</ol><button className="button-secondary mt-4" type="button" onClick={() => setHintShown(true)}>Show one hint</button>{hintShown && <p className="mt-3 rounded-xl bg-blue-50 p-4 text-sm"><strong>Hint:</strong> {lesson.guided.hint}</p>}</section>

    <section className="card"><p className="eyebrow">Independent practice · {lesson.independentTask.responseType} response</p><h2 className="mt-2 text-2xl font-bold">Apply it without the worked steps</h2><p className="mt-3">{lesson.independent}</p><p className="mt-3 font-semibold">{lesson.independentTask.prompt}</p><details className="mt-3 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer font-semibold">Mark scheme</summary><ul className="mt-2 grid gap-1 text-sm">{lesson.independentTask.markScheme.map(item=><li key={item}>□ {item}</li>)}</ul></details><textarea className={`input mt-4 min-h-36 ${lesson.independentTask.responseType === "code" ? "font-mono" : ""}`} value={practiceText} onChange={event => setPracticeText(event.target.value)} aria-label="Independent practice response"/><button className="button mt-4" type="button" onClick={savePractice}>Save practice and get feedback</button></section>

    <section className="card"><p className="eyebrow">Knowledge check</p><h2 className="mt-2 text-2xl font-bold">{lesson.knowledge.prompt}</h2><div className="mt-4 grid gap-2">{lesson.knowledge.options.map((option, index) => <label className="rounded-xl border border-slate-200 p-3" key={`${option}-${index}`}><input className="mr-3" type="radio" name="knowledge" checked={knowledgeChoice === index} onChange={() => setKnowledgeChoice(index)}/>{option}</label>)}</div><button className="button-secondary mt-4" type="button" disabled={knowledgeChoice == null} onClick={() => setKnowledgeChecked(true)}>Check answer</button>{knowledgeChecked && <p className={`mt-4 rounded-xl p-4 ${knowledgeChoice === lesson.knowledge.answer ? "bg-teal-50 text-teal-950" : "bg-amber-50 text-amber-950"}`}><strong>{knowledgeChoice === lesson.knowledge.answer ? "Correct." : "Not yet."}</strong> {lesson.knowledge.feedback}</p>}</section>

    <section className="card"><p className="eyebrow">Lesson completion</p><p className="mt-2">Completing the teaching does not award mastery. It records that you are ready for independent assessment.</p><button className="button mt-4" type="button" onClick={completeLesson}>{evidence.lessonCompletedAt ? "Lesson completion saved" : "Mark lesson content complete"}</button></section>

    <p className="rounded-xl bg-violet-50 p-4 text-sm font-semibold">Next independent mastery attempt: {(evidence.independentAttempts ?? 0) + 1}. At least three comparable unhinted attempts are required; one answer cannot award mastery.</p>
    <section className="card border-violet-200"><p className="eyebrow">Independent mastery check</p><h2 className="mt-2 text-2xl font-bold">{masteryPrompt}</h2><ul className="mt-4 grid gap-2 text-sm">{lesson.mastery.checklist.map(item => <li key={item}>□ {item}</li>)}</ul><textarea className="input mt-4 min-h-44" value={masteryText} onChange={event => setMasteryText(event.target.value)} aria-label="Mastery response"/><button className="button mt-4" type="button" onClick={submitMastery}>Submit independent mastery evidence</button></section>

    {(message || syncPending) && <p role="status" className="rounded-xl bg-slate-900 p-4 text-sm text-white">{syncPending ? "Saving progress…" : message}</p>}

    <section className="card"><p className="eyebrow">Topic summary</p><ul className="mt-4 grid gap-2">{lesson.summary.map(item => <li key={item}>✓ {item}</li>)}</ul><div className="mt-6 flex flex-wrap gap-3">{nextTopic ? <Link className="button" href={topicHref(unit.code, nextTopic.code)}>Next recommended topic: {nextTopic.title} →</Link> : <Link className="button" href={`/curriculum/units/${unit.code}/project`}>Preview the Challenge project →</Link>}<Link className="button-secondary" href={`/curriculum/units/${unit.code}`}>Back to Unit {unit.code}</Link></div></section>
  </div>;
}

export function ProjectJourney({ unit, initialProgress = null }: { unit: PearsonUnit; initialProgress?: LearningProgress | null }) {
  const { progress } = useProgress(initialProgress);
  const meta = metaForUnit(unit.code);
  const readiness = projectReady(progress, unit.code, unit.topics.map(topic => topic.code));
  const [reflection, setReflection] = useState("");
  return <div className="grid gap-6">
    {readiness.override && <section className="card border-blue-300 bg-blue-50"><p className="eyebrow">Exceptional teacher unlock</p><p className="mt-2"><strong>{readiness.override.teacher}</strong> granted access for this documented reason: {readiness.override.reason}</p><p className="mt-2 text-sm">This access does not award mastery, bypass mandatory assignment evidence or complete the project.</p></section>}
    <section className={`card ${readiness.ready ? "border-teal-300 bg-teal-50" : "border-amber-300 bg-amber-50"}`}><p className="eyebrow">Readiness</p><h2 className="mt-2 text-2xl font-bold">{readiness.ready ? "Project unlocked" : "Project preview: locked"}</h2><p className="mt-3">{readiness.ready ? "Every required topic has independent mastery evidence of at least 70%." : "Complete the missing independent mastery checks. Lesson completion or learner-selected level alone cannot unlock the project."}</p>{!readiness.ready && <div className="mt-4 flex flex-wrap gap-2">{readiness.missing.map(code => <Link className="link rounded-full bg-white px-3 py-2 text-sm" href={topicHref(unit.code, code)} key={code}>Learn {unit.topics.find(topic => topic.code === code)?.title}</Link>)}</div>}</section>
    <Info title="Vocational scenario"><p>{meta.project.scenario}</p></Info>
    <Info title="Project brief"><p>{meta.project.brief}</p></Info>
    <Info title="Required deliverables"><List items={meta.project.deliverables}/></Info>
    <div className="grid gap-6 md:grid-cols-2"><Info title="Pearson learning aims"><List items={meta.project.aims}/></Info><Info title="Relevant criteria"><List items={meta.project.criteria}/></Info></div>
    <Info title="Skills and knowledge to apply"><List items={unit.topics.map(topic => `${topic.code} ${topic.title}: ${topic.content.slice(0, 3).join(", ")}`)}/></Info>
    <Info title="Additional extension knowledge"><p>{meta.project.extension}</p></Info>
    <Info title="Suggested stages"><ol className="grid gap-2">{meta.project.stages.map((item, index) => <li key={item}><strong>{index + 1}.</strong> {item}</li>)}</ol></Info>
    <Info title="Evidence requirements"><List items={meta.project.evidence}/></Info>
    <Info title="Success checklist"><List items={meta.project.checklist}/></Info>
    <Info title="Assessment rubric"><div className="grid gap-3 md:grid-cols-3">{meta.project.rubric.map(item => <div className="rounded-xl bg-slate-50 p-4" key={item.band}><h3 className="font-bold">{item.band}</h3><p className="mt-2 text-sm text-slate-600">{item.description}</p></div>)}</div></Info>
    <Info title="Reflection after completion"><List items={meta.project.reflection}/><textarea disabled={!readiness.ready} className="input mt-4 min-h-36" value={reflection} onChange={event => setReflection(event.target.value)} placeholder={readiness.ready ? "Complete this after carrying out the project." : "Unlock the project before recording reflection."}/><p className="mt-3 text-sm text-slate-500">Projects are never automatically completed or awarded. A teacher must review the product and its evidence.</p></Info>
  </div>;
}

function Info({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card"><p className="eyebrow">{title}</p><div className="mt-4 leading-7">{children}</div></section>; }
function List({ items }: { items: string[] }) { return <ul className="grid gap-2">{items.map(item => <li key={item}>✓ {item}</li>)}</ul>; }
