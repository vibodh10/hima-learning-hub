import {miniStudyLearnerSummary,type MiniStudyRecord} from "@/lib/mini-study-report";

export function MiniStudyReport({learners,records}:{learners:{id:string;name:string}[];records:MiniStudyRecord[]}) {
  const rows=learners.map(learner=>({...learner,summary:miniStudyLearnerSummary(records.filter(r=>r.learner_id===learner.id))}))
    .sort((a,b)=>Number(b.summary.needsHelp)-Number(a.summary.needsHelp)||a.name.localeCompare(b.name));
  return <section aria-labelledby="mini-report-title">
    <h1 id="mini-report-title" className="text-3xl font-bold">Short self-study records</h1>
    <p className="mt-3 max-w-3xl">Starting points, first answers and next targets. These are small learning checks, not assignment grades. Different topics and starting-point versions are not directly comparable.</p>
    {!rows.length?<p className="card mt-6">No students have joined this group yet.</p>:<div className="mt-6 grid gap-4">{rows.map(row=><details className="card" key={row.id}>
      <summary className="cursor-pointer text-lg font-bold">{row.name} · {row.summary.needsHelp?"Support suggested":row.summary.latest?"Learning recorded":"Starting point or next step pending"}</summary>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        <div><dt className="font-semibold">Short starting point</dt><dd>{row.summary.baseline?`${row.summary.baseline.correct} of ${row.summary.baseline.total} correct` : "No short starting point recorded. An existing full-unit baseline, if taken, remains in the learner's main record."}</dd></div>
        <div><dt className="font-semibold">Latest new-learning check</dt><dd>{row.summary.latest?`${row.summary.latest.title}: ${row.summary.latest.grade.correct} of ${row.summary.latest.grade.total} correct on first answers. ${row.summary.latest.finished?"Feedback reviewed and step completed.":"Feedback review not yet finished."}`:"No daily check recorded yet."}</dd></div>
        <div><dt className="font-semibold">Recall of the previous idea</dt><dd>{row.summary.recap?`${row.summary.recap.correct} of ${row.summary.recap.total} correct` : "Not checked yet"}</dd></div>
        <div><dt className="font-semibold">Completed short steps</dt><dd>{row.summary.completedSteps}</dd></div>
      </dl>
      <div className="mt-5 rounded-lg border border-slate-300 p-4"><h2 className="font-bold">Automatic next target</h2><p className="mt-2">{row.summary.target}</p></div>
      {row.summary.needsHelp&&<p className="mt-4">Suggested support: check the learner&apos;s understanding of this idea with a short example. This flag is based on the recorded answers, not a judgement of ability.</p>}
    </details>)}</div>}
  </section>;
}
