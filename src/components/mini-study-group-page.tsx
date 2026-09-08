import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {AppHeader} from "./app-header";
import {MiniStudyReport} from "./mini-study-report";
import {loadMiniStudyEvidence} from "@/lib/mini-study-evidence";

export default async function MiniStudyGroupPage({params}:{params:Promise<{id:string}>}){
 const actor=await requireRole("teacher","administrator");
 const {id}=await params;
 const client=await createClient();
 const {data:allowed,error:accessError}=await client.rpc("can_manage_class",{class_uuid:id});
 if(accessError||!allowed)notFound();
 const {data:group,error:groupError}=await client.from("classes").select("name,active_unit_id,published").eq("id",id).is("archived_at",null).maybeSingle();
 if(groupError||!group)notFound();
 const evidence=await loadMiniStudyEvidence(client,id,group.active_unit_id).catch(()=>null);
 return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell max-w-5xl py-8">
  <Link className="link" href="/dashboard#groups">← Your groups</Link>
  <p className="eyebrow mt-6">{group.name}</p>
  {!group.active_unit_id||!group.published?<section className="card mt-5"><h1 className="text-3xl font-bold">Finish this group’s setup</h1><p className="mt-3">Choose the units you teach and the current unit before students begin.</p><Link className="button mt-5" href={`/teacher/classes/${id}/settings`}>Set up group →</Link></section>:<div className="mt-5">{!evidence?<section className="card" role="alert"><h1 className="text-2xl font-bold">Records could not be loaded</h1><p className="mt-3">Refresh to try again. Missing evidence has not been shown as zero progress.</p></section>:<><MiniStudyReport {...evidence} classId={id}/><a className="button-secondary mt-6" href={`/api/reports/classes/${id}/mini-study`}>Download short-study spreadsheet</a></>}</div>}
  <nav className="mt-8 flex flex-wrap gap-5 border-t border-slate-200 pt-5" aria-label="Group options"><Link className="link" href={`/teacher/classes/${id}/settings`}>Group units and registration link</Link><Link className="link" href={`/teacher/classes/${id}/history`}>Earlier records and reports</Link></nav>
 </main></>;
}
