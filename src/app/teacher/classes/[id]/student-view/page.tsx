import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {loadMiniStudyEvidence} from "@/lib/mini-study-evidence";
import {StudentPracticeBadgeExample,StudentPracticeBadges} from "@/components/student-practice-badges";

function related<T>(value:T|T[]|null):T|undefined{return Array.isArray(value)?value[0]:value??undefined;}

export default async function StudentViewPreviewPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{learnerId?:string}>}){
  await requireRole("teacher","administrator");
  const {id}=await params;const {learnerId}=await searchParams;
  const client=await createClient();
  const {data:allowed,error:accessError}=await client.rpc("can_manage_class",{class_uuid:id});
  if(accessError||!allowed)notFound();
  const [{data:group,error:groupError},{data:activeUnits,error:unitsError}]=await Promise.all([
    client.from("classes").select("name,published").eq("id",id).is("archived_at",null).maybeSingle(),
    client.from("class_units").select("unit_id,units!inner(code,title)").eq("class_id",id).eq("active",true).is("archived_at",null).order("unit_id"),
  ]);
  if(groupError||!group||unitsError)notFound();
  const unitIds=(activeUnits??[]).map(item=>item.unit_id);
  const unitLabels=(activeUnits??[]).flatMap(item=>{const unit=related(item.units);return unit?[`Unit ${unit.code}: ${unit.title}`]:[];});
  const evidence=await loadMiniStudyEvidence(client,id,unitIds).catch(()=>null);
  if(!evidence)return <main className="shell max-w-5xl py-8"><Link className="link" href={`/teacher/classes/${id}`}>← Back to group</Link><section className="card mt-6"><h1 className="text-2xl font-bold">Student view could not be loaded</h1><p className="mt-2">Refresh and try again. No learner data has been changed.</p></section></main>;
  const selected=evidence.learners.find(item=>item.id===learnerId)??evidence.learners[0];
  const records=selected?evidence.records.filter(record=>record.learner_id===selected.id):[];
  const latest=[...records].filter(record=>record.grade&&record.status!=="abandoned").sort((a,b)=>(b.checked_at??b.completed_at??"").localeCompare(a.checked_at??a.completed_at??""))[0];
  const misses=selected?evidence.practiceMisses.filter(item=>item.learner_id===selected.id):[];
  const rate=latest?.grade?.total?latest.grade.correct/latest.grade.total:null;
  const lowWarning=rate!==null&&rate<.5;
  const title=latest?.content.title??(latest?.kind==="baseline"?"Starting point":"Short self-study");
  return <div className="mini-study-surface">
    <header className="mini-study-header"><span>Digital Learning Hub · Student view preview</span><Link href={`/teacher/classes/${id}`}>Back to teacher view</Link></header>
    <main className="mini-study-main">
      <section className="rounded-xl border border-teal-200 bg-teal-50 p-4">
        <p className="font-bold">Teacher preview only</p>
        <p className="mt-1 text-sm">This page reads the learner&apos;s saved evidence and shows the student-facing badge/warning styles. It does not sign in as the learner, open a lesson, answer a question, award XP or change progress.</p>
      </section>
      <section className="mini-study-panel mt-5">
        <p className="mini-study-kicker">{group.name}</p><h1>Preview a learner account</h1>{unitLabels.length>0&&<p>{unitLabels.join(" · ")}</p>}
        {!evidence.learners.length?<p className="mt-4">No students are enrolled in this group yet.</p>:<form method="get" className="mt-4 flex flex-wrap items-end gap-3"><label className="grid gap-2 font-semibold">Learner<select className="input min-w-64" name="learnerId" defaultValue={selected?.id}>{evidence.learners.map(learner=><option key={learner.id} value={learner.id}>{learner.name}</option>)}</select></label><button className="button" type="submit">Show student view</button></form>}
      </section>

      {selected&&<>
        <section className="mt-5"><p className="eyebrow">What {selected.name} currently sees from missed practice</p><div className="mt-3">{misses.length?<StudentPracticeBadges misses={misses}/>:<div className="rounded-xl border border-slate-200 bg-white p-4"><strong>No red badges are currently visible for this learner this week.</strong><p className="mt-1 text-sm">Use the example below if you want to check the exact learner-facing appearance.</p></div>}</div></section>

        {lowWarning&&latest?.grade&&<section className="mini-study-panel mt-5"><p className="mini-study-kicker">Current learning warning style</p><h2 className="text-2xl font-bold">Latest first-attempt check needs attention</h2><p className="mini-study-error mt-4" role="status">{latest.content.assessmentKind?"Learning check warning: this assessment needs reinforcement. The Digital Learning Hub has recorded it and will automatically give relevant practice and recheck the skills.":"Learning check warning: this first-attempt check needs attention. The Digital Learning Hub will automatically give extra explanation, practice and another check."}</p><p className="mt-3 text-sm">Saved evidence: {title} · {latest.grade.correct}/{latest.grade.total} correct. This is a learning-support signal, not a behaviour judgement.</p></section>}

        <section className="mini-study-panel mt-5"><p className="mini-study-kicker">Saved learning state</p><h2 className="text-2xl font-bold">{title}</h2>{latest?.grade?<p className="mt-3">Latest recorded first answers: <strong>{latest.grade.correct}/{latest.grade.total}</strong>. {latest.status==="completed"?"The step is completed.":"Feedback review is not yet finished."}</p>:<p className="mt-3">No graded short-study evidence is recorded yet.</p>}{latest?.target_text&&<p className="mt-2"><strong>Automatic next target:</strong> {latest.target_text}</p>}</section>

        <details className="mini-study-help mt-5"><summary>Show examples of the warnings even if this learner does not currently have them</summary><div className="mt-4 grid gap-4"><StudentPracticeBadgeExample/><div className="rounded-xl border border-red-200 bg-white p-4"><p className="font-semibold">Example learning warning</p><p className="mini-study-error mt-2">Learning check warning: this first-attempt check needs attention. The Digital Learning Hub will automatically give extra explanation, practice and another check.</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold">Example formal-assessment pause</p><p className="mt-2">Return to full screen to continue your assessment. Your answers remain saved in the page, and the full-screen/page-visibility event is recorded for tutor review. It does not automatically fail the learner.</p></div></div></details>
      </>}
    </main>
  </div>;
}
