import Link from "next/link";
import { capitaliseFirst } from "@/lib/display-text";
import type { PearsonUnit } from "@/lib/pearson-curriculum";
import type { LearningProgress } from "@/lib/learning-progress";
import type { StudentWeekAccess } from "@/lib/student-week-access";

export function StudentUnitOverview({
  unit,
  progress,
  startingPointComplete,
  access,
}: {
  unit: PearsonUnit;
  progress: LearningProgress;
  startingPointComplete: boolean;
  access: StudentWeekAccess | null;
}) {
  const focusTopic = unit.topics.find(topic => topic.code === access?.focus.topicCode);
  const focusEvidence = access?.focus ? progress.topics[`${unit.code}:${access.focus.topicCode}`] : undefined;
  const unfinishedStartedWeek = Boolean(focusEvidence?.startedAt && !focusEvidence.masteredAt);

  return <div className="grid gap-6">
    <section className={`card ${startingPointComplete?"border-teal-200 bg-teal-50":"border-blue-200 bg-blue-50"}`}>
      <p className="eyebrow">Week 1 starting point</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">{startingPointComplete?"Original baseline protected":"Complete this once before learning"}</h2><p className="mt-2 text-sm text-slate-700">{startingPointComplete?"It cannot be retaken or overwritten. Later checks are recorded as progress points.":"Your answers establish where you started and do not change your group or timetable."}</p></div>
        {startingPointComplete
          ? <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-teal-900">Completed</span>
          : <Link className="button" href={`/curriculum/units/${unit.code}/starting-point`}>Start my starting point →</Link>}
      </div>
    </section>

    {!access&&startingPointComplete&&<section className="card border-amber-200 bg-amber-50"><p className="eyebrow">Weekly learning</p><h2 className="mt-2 text-2xl font-bold">Your teacher is preparing this unit</h2><p className="mt-3 text-slate-700">No weekly journey is active yet. Future weeks remain hidden until the class plan is ready.</p></section>}

    {access&&startingPointComplete&&access.focus.week>1&&focusTopic&&<section className={`card ${access.currentWeekBlocked||unfinishedStartedWeek?"border-red-300 bg-red-50":"border-violet-200 bg-violet-50"}`}>
      <p className="eyebrow">{access.currentWeekBlocked||unfinishedStartedWeek?"Work unfinished":`This week · Week ${access.focus.week}`}</p>
      <h2 className="mt-2 text-3xl font-bold">{capitaliseFirst(access.focus.title)}</h2>
      <p className="mt-3 max-w-3xl leading-7 text-slate-700">{capitaliseFirst(access.focus.focus)}</p>
      {(access.currentWeekBlocked||unfinishedStartedWeek)&&<p className="mt-3 font-semibold text-red-800">Continue now. The alert clears when this week is completed.</p>}
      <Link className="button mt-5" href={`/curriculum/units/${unit.code}/topics/${encodeURIComponent(focusTopic.code)}`}>{access.currentWeekBlocked||unfinishedStartedWeek?"Continue unfinished work":"Start this week"}</Link>
    </section>}

    {access?.currentWeekBlocked&&<section className="card border-slate-200 bg-slate-50"><p className="eyebrow">Week {access.scheduledWeek} waiting</p><h2 className="mt-2 text-xl font-bold">Complete Week {access.focus.week} first</h2><p className="mt-2 text-sm text-slate-600">The next week stays locked. This overdue learning also appears in your teacher&apos;s Needs attention view.</p></section>}

  </div>;
}
