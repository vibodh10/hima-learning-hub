import {startingPointRoute} from "@/lib/starting-point-route";
import Link from "next/link";
import {miniStudyLearnerSummary,type MiniStudyRecord,type StudyIntegrityEvent,type StudyIntervention,type StudyLegacyBaseline,type StudyPracticeMiss,type StudyUnitRef} from "@/lib/mini-study-report";

const legacyUnit="__legacy__";
const evidenceUnit=(row:{unit_id?:string})=>row.unit_id??legacyUnit;
const concernEvent=(event:StudyIntegrityEvent)=>event.event_type!=="fullscreen_return";
const integrityLabel=(event:StudyIntegrityEvent)=>event.event_type==="fullscreen_exit"?"Left full screen":event.event_type==="tab_hidden"?"Assessment tab/window hidden":"Returned to full screen";

function inferredUnits(records:MiniStudyRecord[],baselines:StudyLegacyBaseline[]):StudyUnitRef[]{
  const ids=[...new Set([...records.map(evidenceUnit),...baselines.map(evidenceUnit)])];
  return (ids.length?ids:[legacyUnit]).map(id=>({id,label:id===legacyUnit?"Current unit":"Unit details unavailable"}));
}

export function MiniStudyReport({learners,records,baselines=[],integrityEvents=[],practiceMisses=[],interventions=[],units=[],classId,expanded=false}:{learners:{id:string;name:string}[];records:MiniStudyRecord[];baselines?:StudyLegacyBaseline[];integrityEvents?:StudyIntegrityEvent[];practiceMisses?:StudyPracticeMiss[];interventions?:StudyIntervention[];units?:StudyUnitRef[];classId?:string;expanded?:boolean}) {
  const reportUnits=units.length?units:inferredUnits(records,baselines);
  const unitLabel=new Map(reportUnits.map(unit=>[unit.id,unit.label]));
  const rows=learners.map(learner=>{
    const learnerRecords=records.filter(record=>record.learner_id===learner.id);
    const learnerSessionIds=new Set(learnerRecords.map(record=>record.id));
    const integrityConcernCount=integrityEvents.filter(event=>learnerSessionIds.has(event.session_id)&&concernEvent(event)).length;
    const learnerMisses=practiceMisses.filter(item=>item.learner_id===learner.id).sort((a,b)=>a.missed_on.localeCompare(b.missed_on));
    const attendanceIntervention=interventions.find(item=>item.learner_id===learner.id&&item.kind==="missed_self_study"&&item.status==="open");
    const learnerUnits=reportUnits.map(unit=>{
      const own=learnerRecords.filter(r=>evidenceUnit(r)===unit.id);
      const legacy=baselines.find(b=>b.learner_id===learner.id&&evidenceUnit(b)===unit.id);
      return {unit,own,legacy,summary:miniStudyLearnerSummary(own),hasFormative:own.some(record=>record.content.assessmentKind==="formative"&&record.grade)};
    });
    const warningCount=learnerUnits.reduce((sum,item)=>sum+item.summary.assessment.warningCount,0);
    const assessmentReviewRequired=warningCount>=3;
    const attendanceReviewRequired=learnerMisses.length>=3||Boolean(attendanceIntervention);
    return {...learner,learnerUnits,warningCount,integrityConcernCount,learnerMisses,attendanceIntervention,assessmentReviewRequired,attendanceReviewRequired,reviewRequired:assessmentReviewRequired||attendanceReviewRequired,needsHelp:learnerUnits.some(item=>item.summary.needsHelp),hasLearning:learnerUnits.some(item=>Boolean(item.summary.latest)),hasStartingPoint:learnerUnits.some(item=>Boolean(item.summary.baseline||item.legacy))};
  }).sort((a,b)=>Number(b.reviewRequired)-Number(a.reviewRequired)||b.learnerMisses.length-a.learnerMisses.length||b.integrityConcernCount-a.integrityConcernCount||Number(b.needsHelp)-Number(a.needsHelp)||a.name.localeCompare(b.name));

  return <section aria-labelledby="mini-report-title">
    <h1 id="mini-report-title" className="text-3xl font-bold">Short self-study records</h1>
    <p className="mt-3 max-w-3xl">Starting points, recent practice, automatic fortnightly formative assessments, monthly summative assessments, missed-practice attendance and next targets. Each unit is kept separate. The Digital Learning Hub automatically reteaches and rechecks weak skills; assessment integrity events are factual browser events for teacher review, not an automatic finding of cheating.</p>
    {!rows.length?<p className="card mt-6">No students have joined this group yet.</p>:<div className="mt-6 grid gap-4">{rows.map(row=><details className="card" key={row.id} open={expanded}>
      <summary className="cursor-pointer text-lg font-bold">{row.name} · {row.reviewRequired?"Teacher attention required":row.needsHelp?"Automatic reinforcement active":row.hasLearning?"Learning recorded":row.hasStartingPoint?"Starting point recorded · next lesson pending":"No short lesson recorded yet"}{row.learnerMisses.length?` · red badges ${row.learnerMisses.length}`:""}{row.integrityConcernCount>0?` · integrity events ${row.integrityConcernCount}`:""}</summary>
      {row.attendanceReviewRequired&&<div className="mt-4 rounded-lg bg-red-50 p-4"><p><strong>Missed-practice intervention. </strong>{row.learnerMisses.length} required practice day{row.learnerMisses.length===1?"":"s"} missed this school week. At three badges the Digital Learning Hub creates an intervention record and alerts the tutor when email is configured.</p><div className="mt-2 flex flex-wrap gap-2">{row.learnerMisses.map(miss=><span key={miss.id} className="rounded-full bg-red-700 px-3 py-1 text-xs font-bold text-white">Red badge · {miss.missed_on}</span>)}</div><p className="mt-2 text-sm">Review barriers and support with the learner. These badges record attendance only; they do not grade ability or automatically apply a sanction.</p></div>}
      {!row.attendanceReviewRequired&&row.learnerMisses.length>0&&<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"><strong>Missed practice: </strong>{row.learnerMisses.length} red badge{row.learnerMisses.length===1?"":"s"} this week. Teacher escalation starts automatically at three.</div>}
      {row.assessmentReviewRequired&&<p className="mt-4 rounded-lg bg-red-50 p-4"><strong>Learning evidence review required. </strong>{row.warningCount} low first-attempt learning checks have been recorded across this learner&apos;s active units in the last seven days. Review the evidence before deciding the cause or any behaviour action.</p>}
      {row.integrityConcernCount>0&&<p className="mt-4 rounded-lg bg-amber-50 p-4"><strong>Assessment integrity record: </strong>{row.integrityConcernCount} full-screen or page-visibility event{row.integrityConcernCount===1?" has":"s have"} been recorded. Review the timestamps below in context; the system does not automatically fail or accuse the learner.</p>}
      <div className="mt-5 grid gap-5">{row.learnerUnits.map(item=>{
        const latestSession=item.summary.assessment.latest?.sessionId;
        const assessmentEvents=latestSession?integrityEvents.filter(event=>event.session_id===latestSession):[];
        const assessmentConcerns=assessmentEvents.filter(concernEvent);
        const formativeProgress=item.summary.assessment.formativeProgress;
        return <article key={item.unit.id} className="rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-xl font-bold">{item.unit.label}</h2>{classId&&item.hasFormative&&<Link className="button-secondary" href={`/teacher/classes/${classId}/learners/${row.id}/formative-report?unitId=${item.unit.id}`}>Open submission-ready formative report</Link>}</div>
        {item.summary.supportReason&&<p className="mt-4 rounded-lg bg-amber-50 p-4"><strong>Automatic support signal: </strong>{item.summary.supportReason}</p>}
        {item.summary.baseline?.feedback.some(f=>f.questionId.startsWith("prereq:"))&&<p className="mt-4 font-semibold">Starting route: {startingPointRoute(item.summary.baseline)}. Provisional guidance, not a grade. {item.summary.latest&&`Latest practice: ${item.summary.latest.grade.correct/item.summary.latest.grade.total<0.5?"reinforcement continues automatically":item.summary.latest.grade.correct/item.summary.latest.grade.total<0.8?"core practice":"stretch work is available"}.`}</p>}
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div><dt className="font-semibold">Starting point</dt><dd>{item.summary.baseline?`Short starting point: ${item.summary.baseline.correct} of ${item.summary.baseline.total} correct`:item.legacy?`Existing full-unit starting point: ${item.legacy.correct_count} of ${item.legacy.question_count} correct. Preserved; no repeat needed.`:"Not recorded yet."}</dd></div>
          <div><dt className="font-semibold">Current expertise</dt><dd>{item.summary.practiceLevel}</dd></div>
          <div><dt className="font-semibold">Latest learning check</dt><dd>{item.summary.latest?`${item.summary.latest.title}: ${item.summary.latest.grade.correct} of ${item.summary.latest.grade.total} correct on first answers. ${item.summary.latest.finished?"Feedback reviewed and step completed.":"Feedback review not yet finished."}`:"No daily check recorded yet."}</dd></div>
          <div><dt className="font-semibold">Recall of the previous idea</dt><dd>{item.summary.recap?`${item.summary.recap.correct} of ${item.summary.recap.total} correct` : "Not checked yet"}</dd></div>
          <div><dt className="font-semibold">Learning warnings · 7 days</dt><dd>{item.summary.assessment.warningCount}</dd></div>
        </dl>
        {formativeProgress&&<div className="mt-5 rounded-lg border border-slate-300 p-4"><h3 className="font-bold">Formative progress</h3>{formativeProgress.from?<p className="mt-2">Formative Assessment {formativeProgress.from.number}: {formativeProgress.from.correct}/{formativeProgress.from.total} → Formative Assessment {formativeProgress.to.number}: {formativeProgress.to.correct}/{formativeProgress.to.total} ({formativeProgress.percentagePointChange!>0?"+":""}{formativeProgress.percentagePointChange} percentage points).</p>:<p className="mt-2">Formative Assessment {formativeProgress.to.number} is recorded. The comparison will populate automatically after the next formative assessment.</p>}</div>}
        {item.summary.assessment.latest&&<div className="mt-5 rounded-lg border border-slate-300 p-4">
          <h3 className="font-bold">Latest automated assessment</h3>
          <p className="mt-2">{item.summary.assessment.latest.title}: {item.summary.assessment.latest.grade.correct} of {item.summary.assessment.latest.grade.total} correct.</p>
          <ul className="mt-3 space-y-1">{item.summary.assessment.latest.skills.map(skill=><li key={skill.skill}><strong>{skill.skill.replaceAll("-"," ")}:</strong> {skill.state} · {skill.correct}/{skill.total}</li>)}</ul>
          <p className="mt-3 text-sm">Skills marked Developing or Needs reinforcement are selected for automatic follow-up practice. No teacher assignment is required.</p>
          <p className="mt-3 text-sm"><strong>Integrity events:</strong> {assessmentConcerns.length} concern event{assessmentConcerns.length===1?"":"s"}{assessmentEvents.some(event=>event.event_type==="fullscreen_return")?"; return-to-full-screen events also recorded":""}.</p>
        </div>}
        <div className="mt-5 rounded-lg border border-slate-300 p-4"><h3 className="font-bold">Automatic next target</h3><p className="mt-2">{item.summary.target}</p></div>
        {item.summary.needsHelp&&<p className="mt-4">The portal will give this learner more explanation, practice and rechecking automatically. This signal is based on recorded answers and is not a fixed judgement of ability or proof of inattentive behaviour.</p>}
      </article>})}</div>
      {classId&&<p className="mt-5"><Link className="link" href={`/teacher/learners/${row.id}?classId=${classId}`}>Open full learner progress</Link></p>}
      <details className="mt-5 border-t border-slate-200 pt-4">
        <summary className="cursor-pointer font-semibold">See recorded answers, feedback and assessment integrity events</summary>
        {records.filter(record=>record.learner_id===row.id&&record.grade&&record.status!=="abandoned")
          .sort((a,b)=>(b.checked_at??"").localeCompare(a.checked_at??""))
          .map(record=>{const events=integrityEvents.filter(event=>event.session_id===record.id);return <article key={record.id} className="mt-4 rounded-lg bg-slate-50 p-4">
            <h3 className="font-bold">{unitLabel.get(evidenceUnit(record))??"Current unit"} · {record.content.title??(record.kind==="baseline"?"Short starting point":"Short self-study")}</h3>
            <p className="mt-1 text-sm">{record.checked_at?new Date(record.checked_at).toLocaleDateString("en-GB",{timeZone:"Europe/London"}):"Date not recorded"} · {record.status==="completed"?"Completed":"Feedback review pending"}</p>
            {record.content.assessmentKind&&<div className="mt-3 rounded-lg border border-slate-200 bg-white p-3"><p className="font-semibold">Assessment integrity</p>{events.length?<ul className="mt-2 space-y-1 text-sm">{events.map((event,index)=><li key={`${event.session_id}-${event.occurred_at}-${index}`}>{new Date(event.occurred_at).toLocaleString("en-GB",{timeZone:"Europe/London"})} · {integrityLabel(event)}</li>)}</ul>:<p className="mt-1 text-sm">No browser integrity events recorded for this assessment.</p>}</div>}
            <ol className="mt-3 space-y-4">{record.grade!.feedback.map(answer=><li key={answer.questionId}>
              <p className="font-semibold">{answer.recap?"Recap: ":""}{answer.prompt??answer.skill.replaceAll("_"," ")}</p>
              <p>First answer: {answer.selectedAnswer??"Not saved in this older record"}</p>
              <p>{answer.correct?"Correct":"Needs practice"} · Expected: {answer.correctAnswer}</p>
              <p className="mt-1">{answer.explanation}</p>
            </li>)}</ol>
          </article>})}
      </details>
    </details>)}</div>}
  </section>;
}
