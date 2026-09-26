import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {AppHeader} from "./app-header";
import {MiniStudyReport} from "./mini-study-report";
import {MiniStudyAssessmentPreview} from "./mini-study-assessment-preview";
import {loadMiniStudyEvidence} from "@/lib/mini-study-evidence";
import type {StudyUnitRef} from "@/lib/mini-study-report";

export default async function MiniStudyGroupPage({params}:{params:Promise<{id:string}>}){
 const actor=await requireRole("teacher","administrator");
 const {id}=await params;
 const client=await createClient();
 const {data:allowed,error:accessError}=await client.rpc("can_manage_class",{class_uuid:id});
 if(accessError||!allowed)notFound();
 const {data:group,error:groupError}=await client.from("classes").select("name,active_unit_id,published").eq("id",id).is("archived_at",null).maybeSingle();
 if(groupError||!group)notFound();
 const {data:activeUnits,error:unitsError}=await client.from("class_units").select("unit_id").eq("class_id",id).eq("active",true).is("archived_at",null).order("unit_id");
 const activeUnitIds=(activeUnits??[]).map(unit=>unit.unit_id);
 const {data:unitRows,error:unitRowsError}=activeUnitIds.length
  ? await client.from("units").select("id,code,title").in("id",activeUnitIds).is("archived_at",null)
  : {data:[],error:null};
 const unitById=new Map((unitRows??[]).map(unit=>[unit.id,unit]));
 const reportUnits:StudyUnitRef[]=activeUnitIds.map(unitId=>{const unit=unitById.get(unitId);return {id:unitId,label:unit?`Unit ${unit.code}: ${unit.title}`:"Unit details unavailable"};});
 const assessmentUnits=activeUnitIds.flatMap(unitId=>{const unit=unitById.get(unitId);return unit?[{code:unit.code,title:unit.title}]:[];});
 const examUnit=(unitRows??[]).some(unit=>String(unit.code)==="14");
 const unit2Exam=(unitRows??[]).some(unit=>String(unit.code)==="2");
 const evidence=!unitsError&&!unitRowsError?await loadMiniStudyEvidence(client,id,activeUnitIds).catch(()=>null):null;
 const unitNames=reportUnits.map(unit=>unit.label);
 return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell max-w-5xl py-8">
  <div className="flex flex-wrap items-center justify-between gap-3"><Link className="link" href="/dashboard#groups">← Your groups</Link><Link className="button-secondary" href={`/teacher/classes/${id}/student-view`}>Preview student view</Link></div>
  <p className="eyebrow mt-6">{group.name}</p>
  {unitNames.length>0&&<p className="mt-2 text-slate-600">{unitNames.join(" · ")}</p>}
  {!activeUnitIds.length||!group.published?<section className="card mt-5"><h1 className="text-3xl font-bold">Finish this group’s setup</h1><p className="mt-3">Choose the units you teach before students begin.</p><Link className="button mt-5" href={`/teacher/classes/${id}/settings`}>Set up group →</Link></section>:<>
   <MiniStudyAssessmentPreview units={assessmentUnits}/>
   <div className="mt-5">{!evidence?<section className="card" role="alert"><h1 className="text-2xl font-bold">Records could not be loaded</h1><p className="mt-3">Refresh to try again. Missing evidence has not been shown as zero progress.</p></section>:<><MiniStudyReport {...evidence} units={reportUnits} classId={id}/><div className="mt-6 flex flex-wrap gap-3"><a className="button-secondary" href={`/api/reports/classes/${id}/mini-study`}>Download short-study spreadsheet</a>{reportUnits.map(unit=><Link key={unit.id} className="button-secondary" href={`/teacher/classes/${id}/formative-assessments?unitId=${unit.id}`}>{unit.label} · whole-class formative view</Link>)}</div></>}</div>
  </>}
  <div className="mt-6 flex flex-wrap gap-3">{unit2Exam&&<Link className="button" href={`/study/unit2-exam?classId=${id}`}>Unit 2 external exam activities →</Link>}{examUnit&&<Link className="button" href={`/study/unit14-exam?classId=${id}`}>Unit 14 teaching and exam practice →</Link>}</div>
  <nav className="mt-8 flex flex-wrap gap-5 border-t border-slate-200 pt-5" aria-label="Group options"><Link className="link" href={`/teacher/classes/${id}/settings`}>Registration link and group units</Link><Link className="link" href={`/teacher/classes/${id}/history`}>Earlier records and reports</Link></nav>
 </main></>;
}
