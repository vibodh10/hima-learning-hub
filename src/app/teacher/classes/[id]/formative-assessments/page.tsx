import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {loadMiniStudyEvidence} from "@/lib/mini-study-evidence";
import {buildFormativeCohortSummary} from "@/lib/formative-cohort-report";

function related<T>(value:T|T[]|null):T|undefined{return Array.isArray(value)?value[0]:value??undefined;}

export default async function FormativeCohortPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{unitId?:string}>}){
  const actor=await requireRole("teacher","administrator");
  const {id}=await params;const {unitId}=await searchParams;
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
  const summary=buildFormativeCohortSummary(evidence.learners,evidence.records,unitId);
  const unitLabel=`Unit ${unit.code}: ${unit.title}`;

  return <main className="shell max-w-7xl py-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link className="link" href={`/teacher/classes/${id}`}>← Back to group</Link>
      <a className="button-secondary" href={`/api/reports/classes/${id}/formative?unitId=${unitId}`}>Download CSV for Excel</a>
    </div>
    <p className="eyebrow mt-6">Whole-group formative assessment view</p>
    <h1 className="mt-2 text-3xl font-bold">{group.name}</h1>
    <p className="mt-2">{unitLabel}</p>
    <p className="mt-3 max-w-4xl text-sm text-slate-600">This screen puts the whole class together so you can see who has completed each formative assessment, the scores, movement between attempts and the main reinforcement areas. Individual evidence reports remain available for the full question-by-question detail.</p>

    {!summary.assessmentNumbers.length?<section className="card mt-6"><h2 className="text-xl font-bold">No formative assessments completed yet</h2><p className="mt-2">The class view will populate automatically when students submit their first formative assessment.</p></section>:<>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.stats.map(stat=><article className="card" key={stat.number}><p className="eyebrow">Formative {stat.number}</p><p className="mt-2 text-2xl font-bold">{stat.completed}/{summary.learners.length}</p><p className="text-sm">students completed</p><p className="mt-2"><strong>Class average:</strong> {stat.average===null?"—":`${stat.average}%`}</p></article>)}
      </section>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="p-3">Student</th>
            {summary.assessmentNumbers.map(number=><th className="p-3" key={number}>F{number}</th>)}
            <th className="p-3">Latest movement</th>
            <th className="p-3">Reinforcement areas</th>
            <th className="p-3">Report</th>
          </tr></thead>
          <tbody>{summary.learners.map(learner=><tr className="border-t border-slate-200 align-top" key={learner.id}>
            <td className="p-3 font-semibold">{learner.name}</td>
            {summary.assessmentNumbers.map(number=>{const a=learner.assessments.find(item=>item.number===number);return <td className="p-3" key={number}>{a?<><strong>{a.percentage}%</strong><div className="text-xs text-slate-500">{a.correct}/{a.total}</div></>:"—"}</td>})}
            <td className="p-3">{learner.change===null?"—":`${learner.change>0?"+":""}${learner.change} pp`}</td>
            <td className="p-3">{learner.targets.length?learner.targets.join(", "):learner.latest?"No current gap recorded":"Not assessed yet"}</td>
            <td className="p-3"><Link className="link" href={`/teacher/classes/${id}/learners/${learner.id}/formative-report?unitId=${unitId}`}>Open individual report</Link></td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
    <p className="mt-5 text-sm text-slate-600">Tutor view: {actor.display_name}. The CSV is intended for filtering, sorting and further analysis in Excel; it does not replace the saved evidence in the Hub.</p>
  </main>;
}
