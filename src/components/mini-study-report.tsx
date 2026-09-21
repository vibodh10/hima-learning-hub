import {startingPointRoute} from "@/lib/starting-point-route";
import Link from "next/link";
import {miniStudyLearnerSummary,type MiniStudyRecord,type StudyLegacyBaseline,type StudyUnitRef} from "@/lib/mini-study-report";

const legacyUnit="__legacy__";
const evidenceUnit=(row:{unit_id?:string})=>row.unit_id??legacyUnit;

function inferredUnits(records:MiniStudyRecord[],baselines:StudyLegacyBaseline[]):StudyUnitRef[]{
  const ids=[...new Set([...records.map(evidenceUnit),...baselines.map(evidenceUnit)])];
  return (ids.length?ids:[legacyUnit]).map(id=>({id,label:id===legacyUnit?"Current unit":"Unit details unavailable"}));
}

export function MiniStudyReport({learners,records,baselines=[],units=[],overdueLearnerIds=[],classId,expanded=false}:{learners:{id:string;name:string}[];records:MiniStudyRecord[];baselines?:StudyLegacyBaseline[];units?:StudyUnitRef[];overdueLearnerIds?:string[];classId?:string;expanded?:boolean}) {
  const reportUnits=units.length?units:inferredUnits(records,baselines);
  const unitLabel=new Map(reportUnits.map(unit=>[unit.id,unit.label]));
  const rows=learners.map(learner=>{
    const learnerUnits=reportUnits.map(unit=>{
      const own=records.filter(r=>r.learner_id===learner.id&&evidenceUnit(r)===unit.id);
      const legacy=baselines.find(b=>b.learner_id===learner.id&&evidenceUnit(b)===unit.id);
      return {unit,own,legacy,summary:miniStudyLearnerSummary(own)};
    });
    return {...learner,learnerUnits,needsHelp:learnerUnits.some(item=>item.summary.needsHelp),hasLearning:learnerUnits.some(item=>Boolean(item.summary.latest)),hasStartingPoint:learnerUnits.some(item=>Boolean(item.summary.baseline||item.legacy))};
  }).sort((a,b)=>Number(b.needsHelp)-Number(a.needsHelp)||a.name.localeCompare(b.name));

  return <section aria-labelledby="mini-report-title">
    <h1 id="mini-report-title" className="text-3xl font-bold">Short self-study records</h1>
    <p className="mt-3 max-w-3xl">Starting points, recent practice level, first answers and automatic next targets. Each unit is shown separately so evidence from different units is never combined. These are formative learning checks, not assignment grades.</p>
    {!rows.length?<p className="card mt-6">No students have joined this group yet.</p>:<div className="mt-6 grid gap-4">{rows.map(row=><details className={`card ${overdueLearnerIds.includes(row.id)?"practice-overdue-record":""}`} key={row.id} open={expanded}>
      <summary className="cursor-pointer text-lg font-bold">{row.name} · {overdueLearnerIds.includes(row.id)?"Practice overdue - student reminder active":row.needsHelp?"Automatic reinforcement active":row.hasLearning?"Learning recorded":row.hasStartingPoint?"Starting point recorded · next lesson pending":"No short lesson recorded yet"}</summary>
      <div className="mt-5 grid gap-5">{row.learnerUnits.map(item=><article key={item.unit.id} className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-xl font-bold">{item.unit.label}</h2>
        {item.summary.supportReason&&<p className="mt-4 rounded-lg bg-amber-50 p-4"><strong>Automatic support signal: </strong>{item.summary.supportReason}</p>}
        {item.summary.baseline?.feedback.some(f=>f.questionId.startsWith("prereq:"))&&<p className="mt-4 font-semibold">Starting route: {startingPointRoute(item.summary.baseline)}. Provisional guidance, not a grade. {item.summary.latest&&`Latest practice: ${item.summary.latest.grade.correct/item.summary.latest.grade.total<0.5?"reinforcement continues automatically":item.summary.latest.grade.correct/item.summary.latest.grade.total<0.8?"core practice":"stretch work is available"}.`}</p>}
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div><dt className="font-semibold">Starting point</dt><dd>{item.summary.baseline?`Short starting point: ${item.summary.baseline.correct} of ${item.summary.baseline.total} correct`:item.legacy?`Existing full-unit starting point: ${item.legacy.correct_count} of ${item.legacy.question_count} correct. Preserved; no repeat needed.`:"Not recorded yet."}</dd></div>
          <div><dt className="font-semibold">Current practice level</dt><dd>{item.summary.practiceLevel}</dd></div>
          <div><dt className="font-semibold">Latest new-learning check</dt><dd>{item.summary.latest?`${item.summary.latest.title}: ${item.summary.latest.grade.correct} of ${item.summary.latest.grade.total} correct on first answers. ${item.summary.latest.finished?"Feedback reviewed and step completed.":"Feedback review not yet finished."}`:"No daily check recorded yet."}</dd></div>
          <div><dt className="font-semibold">Recall of the previous idea</dt><dd>{item.summary.recap?`${item.summary.recap.correct} of ${item.summary.recap.total} correct` : "Not checked yet"}</dd></div>
          <div><dt className="font-semibold">Completed short steps</dt><dd>{item.summary.completedSteps}</dd></div>
        </dl>
        <div className="mt-5 rounded-lg border border-slate-300 p-4"><h3 className="font-bold">Automatic next target</h3><p className="mt-2">{item.summary.target}</p></div>
        {item.summary.needsHelp&&<p className="mt-4">The portal will give this learner more explanation, practice and rechecking automatically. This signal is based on recorded answers and is not a fixed judgement of ability. No teacher learning task is required.</p>}
      </article>)}</div>
      {classId&&<p className="mt-5"><Link className="link" href={`/teacher/learners/${row.id}?classId=${classId}`}>Open full learner progress</Link></p>}
      <details className="mt-5 border-t border-slate-200 pt-4">
        <summary className="cursor-pointer font-semibold">See recorded answers and feedback</summary>
        {records.filter(record=>record.learner_id===row.id&&record.grade&&record.status!=="abandoned")
          .sort((a,b)=>(b.checked_at??"").localeCompare(a.checked_at??""))
          .map(record=><article key={record.id} className="mt-4 rounded-lg bg-slate-50 p-4">
            <h3 className="font-bold">{unitLabel.get(evidenceUnit(record))??"Current unit"} · {record.content.title??(record.kind==="baseline"?"Short starting point":"Short self-study")}</h3>
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
