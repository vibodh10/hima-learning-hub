import Link from "next/link";
import {miniStudyLearnerSummary,type MiniStudyRecord,type StudyLegacyBaseline} from "@/lib/mini-study-report";

export function MiniStudyReport({learners,records,baselines=[],classId}:{learners:{id:string;name:string}[];records:MiniStudyRecord[];baselines?:StudyLegacyBaseline[];classId?:string}) {
  const rows=learners.map(learner=>({...learner,legacy:baselines.find(b=>b.learner_id===learner.id),summary:miniStudyLearnerSummary(records.filter(r=>r.learner_id===learner.id))}))
    .sort((a,b)=>Number(b.summary.needsHelp)-Number(a.summary.needsHelp)||a.name.localeCompare(b.name));
  return <section aria-labelledby="mini-report-title">
    <h1 id="mini-report-title" className="text-3xl font-bold">Short self-study records</h1>
    <p className="mt-3 max-w-3xl">Starting points, first answers and next targets. These are small learning checks, not assignment grades. Different topics and starting-point versions are not directly comparable.</p>
    {!rows.length?<p className="card mt-6">No students have joined this group yet.</p>:<div className="mt-6 grid gap-4">{rows.map(row=><details className="card" key={row.id}>
      <summary className="cursor-pointer text-lg font-bold">{row.name} · {row.summary.needsHelp?"Support suggested":row.summary.latest?"Learning recorded":"Starting point or next step pending"}</summary>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        <div><dt className="font-semibold">Starting point</dt><dd>{row.summary.baseline?`Short starting point: ${row.summary.baseline.correct} of ${row.summary.baseline.total} correct`:row.legacy?`Existing full-unit starting point: ${row.legacy.correct_count} of ${row.legacy.question_count} correct. Preserved; no repeat needed.`:"Not recorded yet."}</dd></div>
        <div><dt className="font-semibold">Latest new-learning check</dt><dd>{row.summary.latest?`${row.summary.latest.title}: ${row.summary.latest.grade.correct} of ${row.summary.latest.grade.total} correct on first answers. ${row.summary.latest.finished?"Feedback reviewed and step completed.":"Feedback review not yet finished."}`:"No daily check recorded yet."}</dd></div>
        <div><dt className="font-semibold">Recall of the previous idea</dt><dd>{row.summary.recap?`${row.summary.recap.correct} of ${row.summary.recap.total} correct` : "Not checked yet"}</dd></div>
        <div><dt className="font-semibold">Completed short steps</dt><dd>{row.summary.completedSteps}</dd></div>
      </dl>
      <div className="mt-5 rounded-lg border border-slate-300 p-4"><h2 className="font-bold">Automatic next target</h2><p className="mt-2">{row.summary.target}</p></div>
      {classId&&<p className="mt-4"><Link className="link" href={`/teacher/learners/${row.id}?classId=${classId}`}>Earlier evidence and teacher notes</Link></p>}
      {row.summary.needsHelp&&<p className="mt-4">Suggested support: check the learner&apos;s understanding of this idea with a short example. This flag is based on the recorded answers, not a judgement of ability.</p>}
      <details className="mt-5 border-t border-slate-200 pt-4">
        <summary className="cursor-pointer font-semibold">See recorded answers and feedback</summary>
        {records.filter(record=>record.learner_id===row.id&&record.grade&&record.status!=="abandoned")
          .sort((a,b)=>(b.checked_at??"").localeCompare(a.checked_at??""))
          .map(record=><article key={record.id} className="mt-4 rounded-lg bg-slate-50 p-4">
            <h3 className="font-bold">{record.content.title??(record.kind==="baseline"?"Short starting point":"Short self-study")}</h3>
            <p className="mt-1 text-sm">{record.checked_at?new Date(record.checked_at).toLocaleDateString("en-GB",{timeZone:"Europe/London"}):"Date not recorded"} · {record.status==="completed"?"Completed":"Feedback review pending"}</p>
            <ol className="mt-3 space-y-4">{record.grade!.feedback.map(answer=><li key={answer.questionId}>
              <p className="font-semibold">{answer.recap?"Recap: ":""}{answer.prompt??answer.skill.replaceAll("_"," ")}</p>
              <p>First answer: {answer.selectedAnswer??"Not saved in this older record"}</p>
              <p>{answer.correct?"Correct":"Needs practice"} · Expected: {answer.correctAnswer}</p>
              <p className="mt-1">{answer.explanation}</p>
            </li>)}</ol>
          </article>)}
      </details>
    </details>)}</div>}
  </section>;
}
