import type { ReactNode } from "react";

type JourneyStatus = "active" | "paused" | "completed" | string;

export function StudentLearningPlan({
  unitTitle,
  teachingWeek,
  totalTeachingWeeks,
  status,
  pauseMessage,
  currentTopic,
  details,
}: {
  unitTitle: string;
  teachingWeek: number;
  totalTeachingWeeks: number;
  status: JourneyStatus;
  pauseMessage?: string;
  currentTopic?: { code: string; title: string; milestone: string; focus: string };
  details: ReactNode;
}) {
  const safeTotalTeachingWeeks = Math.max(1, totalTeachingWeeks);
  const progress = Math.max(0, Math.min(100, Math.round((teachingWeek / safeTotalTeachingWeeks) * 100)));
  const statusLabel = status === "paused"
    ? "Paused for college break"
    : status === "completed"
      ? "Journey complete"
      : "In progress";
  const statusStyle = status === "paused"
    ? "bg-sky-100 text-sky-900"
    : status === "completed"
      ? "bg-teal-100 text-teal-900"
      : "bg-emerald-100 text-emerald-900";

  return <section className="card mt-8" aria-labelledby="student-learning-plan-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="eyebrow">Your learning plan</p>
        <h2 className="mt-2 text-2xl font-bold" id="student-learning-plan-title">{unitTitle}</h2>
        <p className="mt-2 text-sm font-semibold text-teal-800">Teaching Week {teachingWeek} of {totalTeachingWeeks}</p>
      </div>
      <span className={`rounded-full px-3 py-2 text-sm font-bold ${statusStyle}`}>{statusLabel}</span>
    </div>
    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${progress}% of the teaching journey reached`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
      <div className="h-full rounded-full bg-teal-600" style={{ width: `${progress}%` }}/>
    </div>
    {pauseMessage&&<p className="mt-4 rounded-xl bg-sky-50 p-4 text-sm text-sky-950">{pauseMessage}</p>}
    {currentTopic&&<div className="mt-5 rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Now: {currentTopic.code}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{currentTopic.title}</h3>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">{currentTopic.milestone}</span>
      </div>
    </div>}
    <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-bold">More about my learning plan</summary>
      {currentTopic&&<p className="mt-4 text-sm leading-6 text-slate-600">{currentTopic.focus}</p>}
      {details}
    </details>
    <p className="mt-4 text-xs text-slate-500">Use the Continue button above. The portal keeps your place automatically.</p>
  </section>;
}
