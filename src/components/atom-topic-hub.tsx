"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveCurriculumProgress } from "@/app/actions/curriculum";
import type { ExpertiseLevel } from "@/lib/learning-catalog";
import { routeForTopic, topicKey, type LearningProgress, type TopicEvidence } from "@/lib/learning-progress";
import { teachingSequenceFor } from "@/lib/btec-teaching";
import type { PearsonTopic, PearsonUnit } from "@/lib/pearson-curriculum";

export function AtomTopicHub({
  unit,
  topic,
  storageKey,
  initialEvidence,
  initialLevel,
}: {
  unit: PearsonUnit;
  topic: PearsonTopic;
  storageKey: string;
  catchUp?: boolean;
  evidenceStage?: "before" | "learning" | "progress_check_1" | "progress_check_2" | "after";
  initialEvidence?: TopicEvidence;
  initialLevel?: ExpertiseLevel;
}) {
  const [level, setLevel] = useState<ExpertiseLevel>("Core");
  const [part, setPart] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);
  const [positionPending, startPositionSync] = useTransition();
  const cards = useMemo(() => teachingSequenceFor(unit, topic, level), [unit, topic, level]);
  const card = cards[part];
  const practiceHref = `/curriculum/units/${unit.code}/topics/${encodeURIComponent(topic.code)}/practice`;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const saved = readProgress(storageKey);
      const key = topicKey(unit.code, topic.code);
      const section = initialEvidence?.currentSection ?? saved.topics[key]?.currentSection ?? "lesson:1";
      const selectedLevel = routeForTopic(initialEvidence).recommendedLevel ?? initialLevel ?? "Core";
      setLevel(selectedLevel);
      setPart(lessonPart(section, cards.length));
      if (!initialEvidence?.startedAt) {
        localStorage.setItem(storageKey, JSON.stringify({
          ...saved,
          recommendedLevel: selectedLevel,
          currentPosition: { unitCode: unit.code, topicCode: topic.code, section },
          topics: { ...saved.topics, [key]: { currentSection: section } },
        }));
        startPositionSync(async () => {
          await saveCurriculumProgress({ unitCode: unit.code, topicCode: topic.code, currentSection: section });
        });
      }
    });
    return () => { active = false; };
  }, [cards.length, initialEvidence, initialLevel, storageKey, topic.code, unit.code]);

  function saveSection(section: string) {
    const saved = readProgress(storageKey);
    const key = topicKey(unit.code, topic.code);
    localStorage.setItem(storageKey, JSON.stringify({
      ...saved,
      currentPosition: { unitCode: unit.code, topicCode: topic.code, section },
      topics: { ...saved.topics, [key]: { ...saved.topics[key], currentSection: section } },
    }));
    startPositionSync(async () => {
      await saveCurriculumProgress({ unitCode: unit.code, topicCode: topic.code, currentSection: section });
    });
  }

  function move(next: number) {
    const selected = Math.max(0, Math.min(cards.length - 1, next));
    setPart(selected);
    setAnswerShown(false);
    saveSection(`lesson:${selected + 1}`);
  }

  return <div className="grid gap-6">
    <section className="card border-teal-200 bg-teal-50">
      <p className="eyebrow">This week</p>
      <h2 className="mt-2 text-3xl font-bold">Learn, practise, test, done</h2>
      <ol className="mt-5 grid gap-2 sm:grid-cols-4" aria-label="Weekly learning steps">
        <Step current label="1. Learn"/>
        <Step label="2. Practice"/>
        <Step label="3. Test"/>
        <Step label="4. Done"/>
      </ol>
      {positionPending && <p className="mt-3 text-sm text-teal-900" role="status">Saving your place...</p>}
    </section>

    <article className="card mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow">Short lesson {part + 1} of {cards.length}</p><h2 className="mt-2 text-2xl font-bold">{card.title}</h2></div>
        <span className="rounded-full bg-teal-100 px-3 py-2 text-sm font-bold text-teal-900">2 to 4 minutes</span>
      </div>
      <p className="mt-3 text-slate-600">{card.purpose}</p>
      <div className="mt-6 grid gap-4">{card.points.map(point => <section className="rounded-2xl bg-slate-50 p-5" key={point.concept}>
        <h3 className="text-lg font-bold">{point.concept}</h3>
        <p className="mt-3 leading-7 text-slate-700">{point.explanation}</p>
        <p className="mt-4 rounded-xl bg-white p-4 text-sm"><strong>Example:</strong> {point.example}</p>
      </section>)}</div>
      <section className="mt-5 rounded-xl border border-violet-200 p-5">
        <p className="font-semibold">{card.checkQuestion}</p>
        {answerShown
          ? <p className="mt-3 rounded-xl bg-violet-50 p-4 text-sm"><strong>Check:</strong> {card.checkAnswer}</p>
          : <button className="button-secondary button-small mt-4" onClick={() => setAnswerShown(true)}>Check my understanding</button>}
      </section>
      <div className="mt-6 flex flex-wrap gap-3">
        {part > 0 && <button className="button-secondary" onClick={() => move(part - 1)}>Previous</button>}
        {part < cards.length - 1
          ? <button className="button" onClick={() => move(part + 1)}>Continue</button>
          : <Link className="button" href={practiceHref} onClick={() => saveSection("practice")}>Start practice and test</Link>}
      </div>
    </article>
  </div>;
}

function Step({ label, current = false }: { label: string; current?: boolean }) {
  return <li className={`rounded-xl px-4 py-3 text-sm font-bold ${current ? "bg-white text-teal-950" : "bg-teal-100 text-teal-900"}`}>{label}</li>;
}

function readProgress(storageKey: string): LearningProgress {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? "") as LearningProgress; }
  catch { return { topics: {} }; }
}

function lessonPart(section: string, cardCount: number) {
  const match = /^lesson:(\d+)$/.exec(section);
  return Math.max(0, Math.min(cardCount - 1, Number(match?.[1] ?? 1) - 1));
}
