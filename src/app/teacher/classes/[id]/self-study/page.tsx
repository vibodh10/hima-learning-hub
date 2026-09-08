import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {AppHeader} from "@/components/app-header";
import {MiniStudyReport} from "@/components/mini-study-report";
import type {MiniStudyRecord} from "@/lib/mini-study-report";

export default async function SelfStudyReportPage({params}:{params:Promise<{id:string}>}) {
  const actor=await requireRole("teacher","administrator");
  const {id}=await params;
  const client=await createClient();
  const {data:allowed,error:accessError}=await client.rpc("can_manage_class",{class_uuid:id});
  if(accessError || !allowed) notFound();
  const {data:group,error:groupError}=await client.from("classes").select("name,active_unit_id").eq("id",id).is("archived_at",null).maybeSingle();
  if(groupError || !group) notFound();
  const [{data:roster,error:rosterError},{data:records,error:recordsError}]=await Promise.all([
    client.from("enrolments").select("student_id,user_profiles!enrolments_student_id_fkey(display_name)").eq("class_id",id).is("archived_at",null),
    client.from("mini_study_sessions").select("id,learner_id,kind,status,content,grade,target_text,needs_help,checked_at,completed_at").eq("class_id",id).eq("unit_id",group.active_unit_id).neq("status","abandoned"),
  ]);
  const learners=(roster??[]).map(r=>({id:r.student_id,name:(Array.isArray(r.user_profiles)?r.user_profiles[0]:r.user_profiles)?.display_name??"Learner"}));
  return <><AppHeader role={actor.role} name={actor.display_name}/><main className="shell py-8">
    <Link className="font-semibold underline" href={`/teacher/classes/${id}`}>Back to {group.name}</Link>
    <div className="mt-6">{rosterError||recordsError?<section className="card"><h1 className="text-2xl font-bold">Records could not be loaded</h1><p className="mt-3">Please refresh to try again. Missing data has not been shown as zero progress.</p></section>:<MiniStudyReport learners={learners} records={(records??[]) as MiniStudyRecord[]}/>}</div>
  </main></>;
}
