import { createClient } from "@/lib/supabase/server";
import { allStudyRows, loadMiniStudyEvidence } from "@/lib/mini-study-evidence";
import { MiniStudyReport } from "./mini-study-report";

/** Rendered only by the staff learner page; keep group authorization explicit. */
export async function LearnerCurrentStudy({learnerId,classId}:{learnerId:string;classId:string}) {
  const client=await createClient();
  const access=await client.rpc("can_manage_class",{class_uuid:classId});
  if(access.error||!access.data)throw new Error("This learning record is not available.");
  const group=await client.from("classes").select("active_unit_id").eq("id",classId).single();
  if(group.error)throw new Error("The current group could not be loaded.");
  const evidence=await loadMiniStudyEvidence(client,classId,group.data.active_unit_id);
  const learner=evidence.learners.find(item=>item.id===learnerId);
  if(!learner)return null;
  const awards=await allStudyRows((from,to)=>client.from("learner_achievement_point_events")
    .select("id,points,description,awarded_at",{count:"exact"}).eq("learner_id",learnerId)
    .order("awarded_at",{ascending:false}).order("id").range(from,to));
  return <section className="my-6">
    <MiniStudyReport expanded learners={[learner]} records={evidence.records.filter(r=>r.learner_id===learnerId)} baselines={evidence.baselines.filter(r=>r.learner_id===learnerId)}/>
    <details className="card mt-4"><summary className="cursor-pointer font-bold">Where the {awards.reduce((sum,row)=>sum+row.points,0)} AP came from</summary>
      <p className="mt-3">AP and XP are the same permanent achievement points. These awards cover this learner&apos;s learning across the organisation. Completing a short lesson can earn points without completing a separate full topic assessment.</p>
      <ul className="mt-4 space-y-2">{awards.map(award=><li key={award.id}><strong>+{award.points} AP</strong> · {award.description} · {new Date(award.awarded_at).toLocaleDateString("en-GB",{timeZone:"Europe/London"})}</li>)}</ul>
      {!awards.length&&<p className="mt-3">No achievement points recorded yet.</p>}
    </details>
    <p className="mt-4 rounded-xl border border-slate-300 bg-white p-4">The earlier topic tables below use separate assessments. “Not assessed” there means no result from that assessment; it does not mean this learner has done no lessons. Short checks do not establish mastery of every topic skill.</p>
  </section>;
}
