import Link from "next/link";

type ClassChoice = { id: string; name: string };

export function TeacherLearnerSummary({
  learnerName,
  learnerId,
  groupName,
  courseTitle,
  unitTitle,
  currentWeek,
  startingPoint,
  latestTest,
  targetSummary,
  attentionStatus,
  attentionReason,
  groupHref,
  learnerHref,
  classChoices,
  weeklyPeriod,
  quarterlyPeriod,
}: {
  learnerName: string;
  learnerId: string;
  groupName: string;
  courseTitle: string;
  unitTitle: string;
  currentWeek: number | null;
  startingPoint: string;
  latestTest: string;
  targetSummary: string;
  attentionStatus: string;
  attentionReason: string;
  groupHref: string;
  learnerHref: string;
  classChoices: ClassChoice[];
  weeklyPeriod: { from: string; to: string };
  quarterlyPeriod: { from: string; to: string };
}) {
  const needsAttention = ["intervention_required", "action_required", "catch_up_required"].includes(attentionStatus);
  const weeklyHref = reportHref(learnerHref, weeklyPeriod);
  const quarterlyHref = reportHref(learnerHref, quarterlyPeriod);

  return <main className="shell py-10">
    <Link className="link" href={groupHref}>Back to {groupName}</Link>

    <header className="mt-8">
      <p className="eyebrow">Student progress</p>
      <h1 className="mt-2 text-4xl font-bold">{learnerName}</h1>
      <p className="mt-2 text-slate-600">{courseTitle}</p>
    </header>

    {classChoices.length > 1 && <nav aria-label="Choose learner group" className="mt-6 flex flex-wrap gap-2">
      {classChoices.map(choice => <Link className={choice.name === groupName ? "button" : "button-secondary"} href={`/teacher/learners/${learnerId}?classId=${choice.id}`} key={choice.id}>{choice.name}</Link>)}
    </nav>}

    <section className={`card mt-8 ${needsAttention ? "border-red-300 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
      <p className="eyebrow">{needsAttention ? "Needs attention" : "On track"}</p>
      <h2 className="mt-2 text-2xl font-bold">{needsAttention ? "This student needs help" : "No teacher action is needed"}</h2>
      <p className="mt-3 max-w-3xl text-slate-700">{attentionReason}</p>
    </section>

    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Student summary">
      <Fact label="Current unit" value={unitTitle}/>
      <Fact label="Teaching week" value={currentWeek ? `Week ${currentWeek}` : "Not started"}/>
      <Fact label="Starting point" value={startingPoint}/>
      <Fact label="Latest weekly test" value={latestTest}/>
    </section>

    <section className="card mt-6">
      <p className="eyebrow">Reports</p>
      <h2 className="mt-2 text-2xl font-bold">Download the evidence</h2>
      <p className="mt-2 max-w-3xl text-slate-600">Each report uses the work already stored by the portal, including starting point, tasks, feedback, improvements and targets. Nothing is invented.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a className="button" href={weeklyHref}>Weekly report</a>
        <a className="button-secondary" href={quarterlyHref}>Quarterly report</a>
        <a className="button-secondary" href={learnerHref}>Full report</a>
      </div>
      <p className="mt-4 text-sm text-slate-600">Current targets: {targetSummary}</p>
    </section>

    <section className="card mt-6">
      <p className="eyebrow">Automatic teacher assistant</p>
      <h2 className="mt-2 text-2xl font-bold">What happens without teacher admin</h2>
      <ol className="mt-5 grid gap-3 text-slate-700 sm:grid-cols-2">
        <li className="rounded-xl bg-slate-50 p-4"><strong>1. Learn and practise</strong><p className="mt-1 text-sm">Only the required teaching week is shown.</p></li>
        <li className="rounded-xl bg-slate-50 p-4"><strong>2. Weekly test</strong><p className="mt-1 text-sm">The result and mistakes are stored automatically.</p></li>
        <li className="rounded-xl bg-slate-50 p-4"><strong>3. Targeted redo</strong><p className="mt-1 text-sm">Only weak areas return for more practice.</p></li>
        <li className="rounded-xl bg-slate-50 p-4"><strong>4. Report ready</strong><p className="mt-1 text-sm">Feedback, improvement and targets are assembled from saved evidence.</p></li>
      </ol>
    </section>
  </main>;
}

function reportHref(base: string, period: { from: string; to: string }) {
  return `${base}&from=${period.from}&to=${period.to}`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="card"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 font-semibold">{value}</p></div>;
}
