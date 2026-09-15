import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {loadMiniStudyEvidence} from "@/lib/mini-study-evidence";
import {miniStudyLearnerSummary} from "@/lib/mini-study-report";

/** The same class/unit evidence as the group page; old target alerts are not lesson-completion flags. */
export async function CurrentStudyOverview({groups}:{groups:{id:string;name:string;active_unit_id:string|null;published:boolean}[]}) {
  const client=await createClient();
  const rows=await Promise.all(groups.filter(group=>group.published&&group.active_unit_id).map(async group=>{
    try {
      const {data:allowed,error}=await client.rpc("can_manage_class",{class_uuid:group.id});
      if(error||!allowed)throw new Error("Group unavailable");
      const evidence=await loadMiniStudyEvidence(client,group.id,group.active_unit_id);
      const summaries=evidence.learners.map(learner=>({...learner,summary:miniStudyLearnerSummary(evidence.records.filter(record=>record.learner_id===learner.id))}));
      return {group,summaries,error:false};
    } catch {return {group,summaries:[],error:true};}
  }));
  const populated=rows.filter(row=>row.error||row.summaries.length);
  return <section className="card mt-6" aria-labelledby="current-study-title">
    <h2 id="current-study-title" className="text-2xl font-bold">Current short lessons</h2>
    <p className="mt-2 text-slate-600">These counts use each group&apos;s current unit. A completed lesson can still reveal an idea to practise; it does not mean the work was missed.</p>
    {!populated.length?<p className="mt-4">Current lesson records will appear here when students join a published group with a current unit.</p>:<div className="mt-5 grid gap-4">{populated.map(({group,summaries,error})=>{
      const completed=summaries.filter(row=>row.summary.completedSteps>0).length;
      const review=summaries.filter(row=>row.summary.latest&&!row.summary.latest.finished).length;
      const pending=summaries.filter(row=>!row.summary.latest).length;
      const support=summaries.filter(row=>row.summary.needsHelp);
      return <article className="rounded-xl border border-slate-200 p-4" key={group.id}>
        <h3 className="font-bold"><Link className="link" href={`/teacher/classes/${group.id}`}>{group.name}</Link></h3>
        {error?<p className="mt-2" role="alert">Current records could not be loaded. Open the group or refresh; no zero total has been assumed.</p>:<>
          <p className="mt-2">{completed} of {summaries.length} students have completed at least one short lesson.</p>
          <p className="mt-2">{support.length} with support suggested · {review} with a latest feedback review unfinished · {pending} with no daily lesson check yet.</p>
          {support.length>0?<details className="mt-3"><summary className="cursor-pointer font-semibold">Who could use support, and why?</summary><ul className="mt-3 space-y-3">{support.map(row=><li key={row.id}><strong>{row.name}: </strong>{row.summary.supportReason}</li>)}</ul></details>:<p className="mt-2 text-sm text-slate-600">No support flags in the latest short-learning checks. This is not an assignment grade or confirmation that all work is complete.</p>}
          <Link className="link mt-3 inline-block" href={`/teacher/classes/${group.id}`}>See students and their recorded answers →</Link>
        </>}
      </article>;
    })}</div>}
  </section>;
}
