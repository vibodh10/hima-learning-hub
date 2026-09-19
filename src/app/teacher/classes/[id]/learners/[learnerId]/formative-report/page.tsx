import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {loadMiniStudyEvidence} from "@/lib/mini-study-evidence";
import {buildFormativeAssessmentReport} from "@/lib/formative-assessment-report";
import {PrintReportButton} from "@/components/print-report-button";

function related<T>(value:T|T[]|null):T|undefined{return Array.isArray(value)?value[0]:value??undefined;}
function displayDate(value:string|null){return value?new Date(value).toLocaleString("en-GB",{timeZone:"Europe/London",dateStyle:"medium",timeStyle:"short"}):"Date not recorded";}

export default async function FormativeReportPage({params,searchParams}:{params:Promise<{id:string;learnerId:string}>;searchParams:Promise<{unitId?:string}>}){
  const actor=await requireRole("teacher","administrator");
  const {id,learnerId}=await params;const {unitId}=await searchParams;
  if(!unitId)notFound();
  const client=await createClient();
  const {data:allowed}=await client.rpc("can_manage_class",{class_uuid:id});
  if(!allowed)notFound();
  const [{data:group},{data:classUnit}]=await Promise.all([
    client.from("classes").select("name").eq("id",id).is("archived_at",null).maybeSingle(),
    client.from("class_units").select("unit_id,units!inner(code,title)").eq("class_id",id).eq("unit_id",unitId).maybeSingle(),
  ]);
  if(!group||!classUnit)notFound();
  const unit=related(classUnit.units);if(!unit)notFound();
  const evidence=await loadMiniStudyEvidence(client,id,[unitId]);
  const learner=evidence.learners.find(item=>item.id===learnerId);if(!learner)notFound();
  const records=evidence.records.filter(record=>record.learner_id===learnerId&&record.unit_id===unitId);
  const report=buildFormativeAssessmentReport(records);
  const generated=new Date().toLocaleDateString("en-GB",{timeZone:"Europe/London",dateStyle:"long"});
  return <main className="shell max-w-5xl py-8 print:max-w-none print:px-0 print:py-0">
    <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
      <Link className="link" href={`/teacher/classes/${id}`}>← Back to group</Link><PrintReportButton/>
    </div>
    <header className="mt-6 border-b border-slate-300 pb-5 print:mt-0">
      <p className="eyebrow">Formative assessment evidence report</p>
      <h1 className="mt-2 text-3xl font-bold">{learner.name}</h1>
      <p className="mt-2">{group.name} · Unit {unit.code}: {unit.title}</p>
      <p className="mt-1 text-sm text-slate-600">Generated {generated} · Tutor view: {actor.display_name}</p>
      <p className="mt-3 text-sm">This report is generated from the learner&apos;s saved first responses and recorded Hima feedback. It keeps the original response evidence alongside improvement targets and later progress.</p>
    </header>

    {!report.assessments.length?<section className="card mt-6"><h2 className="text-xl font-bold">No completed formative assessment yet</h2><p className="mt-2">The report will populate automatically after Formative Assessment 1 is submitted.</p></section>:<>
      <section className="mt-6 break-inside-avoid">
        <h2 className="text-2xl font-bold">Progress between formative assessments</h2>
        {!report.progress.length?<p className="mt-2">Formative Assessment 1 is recorded. A direct progress comparison will appear automatically when Formative Assessment 2 is completed.</p>:<div className="mt-3 grid gap-3">{report.progress.map(item=><article key={`${item.fromNumber}-${item.toNumber}`} className="rounded-xl border border-slate-300 p-4">
          <p className="font-bold">Formative Assessment {item.fromNumber} → Formative Assessment {item.toNumber}</p>
          <p className="mt-1">Score: {item.fromPercentage}% → {item.toPercentage}% ({item.percentagePointChange>0?"+":""}{item.percentagePointChange} percentage points)</p>
          <p className="mt-1"><strong>Skills that improved:</strong> {item.improvedSkills.length?item.improvedSkills.join(", "):"No skill moved to a higher evidence state in this comparison."}</p>
          <p className="mt-1"><strong>Still to improve:</strong> {item.stillToImprove.length?item.stillToImprove.join(", "):"No assessed skill currently needs reinforcement."}</p>
        </article>)}</div>}
      </section>

      <div className="mt-8 grid gap-8">{report.assessments.map(assessment=><section key={assessment.sessionId} className="break-before-page print:break-before-page">
        <div className="rounded-xl border border-slate-300 p-5 print:border-black">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="eyebrow">Formative Assessment {assessment.number}</p><h2 className="text-2xl font-bold">{assessment.title}</h2><p className="mt-1 text-sm">Submitted {displayDate(assessment.checkedAt)}</p></div>
            <p className="text-xl font-bold">{assessment.correct}/{assessment.total} · {assessment.percentage}%</p>
          </div>
          <div className="mt-5"><h3 className="font-bold">Overall feedback</h3><p className="mt-1">{assessment.feedback}</p></div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div><h3 className="font-bold">What went well</h3><ul className="mt-2 list-disc space-y-1 pl-5">{assessment.whatWentWell.map(item=><li key={item}>{item}</li>)}</ul></div>
            <div><h3 className="font-bold">Where improvement is needed</h3><ul className="mt-2 list-disc space-y-1 pl-5">{assessment.needsImprovement.map(item=><li key={item}>{item}</li>)}</ul></div>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div><h3 className="font-bold">Target areas</h3>{assessment.targetAreas.length?<ul className="mt-2 list-disc space-y-1 pl-5">{assessment.targetAreas.map(item=><li key={item}>{item}</li>)}</ul>:<p className="mt-2">Continue normal second practice on taught topics.</p>}</div>
            <div><h3 className="font-bold">Practice assigned by Hima</h3><ul className="mt-2 list-disc space-y-1 pl-5">{assessment.practice.map(item=><li key={item}>{item}</li>)}</ul></div>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-xl font-bold">Original learner work and question feedback</h3>
          <p className="mt-1 text-sm">The first saved response is shown for every assessed question. Correct answers are included in this teacher evidence copy.</p>
          <div className="mt-3 grid gap-4">{assessment.originalWork.map((work,index)=><article key={`${assessment.sessionId}-${index}`} className="break-inside-avoid rounded-lg border border-slate-300 p-4">
            <p className="font-bold">Question {index+1} · {work.skill}</p>
            <p className="mt-2">{work.question}</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div><dt className="font-semibold">Learner&apos;s original answer</dt><dd>{work.answer}</dd></div>
              <div><dt className="font-semibold">Outcome</dt><dd>{work.correct?"Correct":"Needs improvement"}</dd></div>
              <div><dt className="font-semibold">Expected answer</dt><dd>{work.expected}</dd></div>
              <div><dt className="font-semibold">Feedback</dt><dd>{work.feedback}</dd></div>
            </dl>
          </article>)}</div>
        </div>
      </section>)}</div>
    </>}
  </main>;
}
