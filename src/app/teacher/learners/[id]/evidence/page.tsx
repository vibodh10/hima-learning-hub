import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import { PrintEvidenceButton } from "@/components/print-evidence-button";
import { requireRole } from "@/lib/auth";
import { topicByCode } from "@/lib/learning-catalog";
import { createClient } from "@/lib/supabase/server";

type Filters={classId?:string;unit?:string;topic?:string};
type Worksheet={id:string;unit_code:string;topic_code:string;attempt_number:number;mode:string;evidence_stage:string;responses:unknown;confidence:number;submitted_at:string};
type Artifact={id:string;unit_code:string;topic_code:string|null;stage:string;title:string;source_type:string;source_id:string|null;version_number:number;evidence:unknown;recorded_at:string};

export default async function LearnerEvidencePage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Filters>}) {
  const actor=await requireRole("administrator");
  const {id}=await params;
  const filters=await searchParams;
  const parsedClassId=z.string().uuid().safeParse(filters.classId);
  if(!parsedClassId.success)notFound();
  const classId=parsedClassId.data;
  const supabase=await createClient();
  const [{data:learner,error:learnerError},{data:enrolment,error:enrolmentError},{data:classUnits,error:classUnitsError}]=await Promise.all([
    supabase.from("user_profiles").select("id,display_name").eq("id",id).eq("role","student").single(),
    supabase.from("enrolments").select("class_id,classes(id,name)").eq("student_id",id).eq("class_id",classId).is("archived_at",null).single(),
    supabase.from("class_units").select("unit_id,units(code,archived_at)").eq("class_id",classId).eq("active",true).is("archived_at",null),
  ]);
  if(learnerError||enrolmentError||classUnitsError||!learner||!enrolment)notFound();
  const selectedUnitCodes=[...new Set((classUnits??[]).flatMap(link=>{const unit=related(link.units);return unit&&!unit.archived_at?[unit.code]:[]}))];
  const [{data:artifactRows,error:artifactError},{data:worksheetRows,error:worksheetError}]=selectedUnitCodes.length?await Promise.all([
    supabase.from("learner_portfolio_artifacts").select("id,unit_code,topic_code,stage,title,source_type,source_id,version_number,evidence,recorded_at").eq("learner_id",id).in("unit_code",selectedUnitCodes).order("recorded_at",{ascending:true}),
    supabase.from("learner_topic_worksheets").select("id,unit_code,topic_code,attempt_number,mode,evidence_stage,responses,confidence,submitted_at").eq("learner_id",id).in("unit_code",selectedUnitCodes).order("submitted_at",{ascending:true}),
  ]):[{data:[],error:null},{data:[],error:null}];
  if(artifactError||worksheetError)throw new Error("The learner evidence view could not be loaded.");
  const artifacts=(artifactRows??[]) as Artifact[];
  const worksheets=(worksheetRows??[]) as Worksheet[];
  const filteredArtifacts=artifacts.filter(item=>(!filters.unit||item.unit_code===filters.unit)&&(!filters.topic||item.topic_code===filters.topic));
  const filteredWorksheets=worksheets.filter(item=>(!filters.unit||item.unit_code===filters.unit)&&(!filters.topic||item.topic_code===filters.topic));
  const worksheetById=new Map(filteredWorksheets.map(item=>[item.id,item]));
  const topics=[...new Map([...artifacts.map(item=>({unit_code:item.unit_code,topic_code:item.topic_code})),...worksheets.map(item=>({unit_code:item.unit_code,topic_code:item.topic_code}))].filter(item=>item.topic_code).map(item=>[`${item.unit_code}:${item.topic_code}`,{unit:item.unit_code,topic:item.topic_code!}])).values()];
  const visibleTopics=topics.filter(item=>(!filters.unit||item.unit===filters.unit)&&(!filters.topic||item.topic===filters.topic));
  const groupName=related(enrolment.classes)?.name??"Current group";

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <div className="no-print"><Link className="link" href={`/teacher/learners/${id}?classId=${classId}`}>← Learner overview</Link></div>
    <header className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Evidence View</p><h1 className="mt-2 text-4xl font-bold">{learner.display_name}</h1><p className="mt-3 text-slate-600">{groupName} · genuine saved evidence from active selected units, shown in teaching-sequence order</p></div><PrintEvidenceButton/></header>

    <form className="card no-print mt-7 grid gap-4 sm:grid-cols-3" method="get"><input type="hidden" name="classId" value={classId}/><label className="grid gap-1 text-sm font-semibold">Unit<select className="input" name="unit" defaultValue={filters.unit??""}><option value="">All units</option>{selectedUnitCodes.map(unit=><option key={unit} value={unit}>Unit {unit}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Topic<select className="input" name="topic" defaultValue={filters.topic??""}><option value="">All topics</option>{topics.filter(item=>!filters.unit||item.unit===filters.unit).map(item=><option key={`${item.unit}:${item.topic}`} value={item.topic}>Unit {item.unit} · {item.topic} · {topicByCode(item.unit,item.topic)?.title??"Configured topic"}</option>)}</select></label><div className="flex items-end gap-3"><button className="button-secondary">Apply</button><Link className="link pb-3 text-sm" href={`/teacher/learners/${id}/evidence?classId=${classId}`}>Clear</Link></div></form>

    <section className="mt-8"><p className="eyebrow">Work over time</p><h2 className="mt-2 text-2xl font-bold">Before and after comparison</h2><div className="mt-5 grid gap-6">{visibleTopics.map(item=>{
      const topicWorks=filteredWorksheets.filter(work=>work.unit_code===item.unit&&work.topic_code===item.topic);
      const before=topicWorks.find(work=>work.evidence_stage==="before");
      const after=[...topicWorks].reverse().find(work=>work.evidence_stage==="after");
      return <article className="card" key={`${item.unit}:${item.topic}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Unit {item.unit} · {item.topic}</p><h3 className="mt-2 text-xl font-bold">{topicByCode(item.unit,item.topic)?.title??"Configured topic"}</h3></div><span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold">{before&&after?"Comparison available":"Evidence incomplete"}</span></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><EvidencePanel title="Before teaching" worksheet={before}/><EvidencePanel title="After teaching" worksheet={after}/></div></article>;
    })}{!visibleTopics.length&&<div className="card"><p className="text-slate-600">No portfolio evidence matches this selection. No learner work or conclusion has been invented.</p></div>}</div></section>

    <section className="card mt-8"><p className="eyebrow">Chronological portfolio</p><h2 className="mt-2 text-2xl font-bold">Starting point, learning, feedback, improvement and progress</h2><div className="mt-5 grid gap-4">{filteredArtifacts.map(artifact=>{const worksheet=artifact.source_id?worksheetById.get(artifact.source_id):undefined;return <article className="border-l-4 border-teal-600 pl-5" key={artifact.id}><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Unit {artifact.unit_code}{artifact.topic_code?` · ${artifact.topic_code}`:""} · {artifact.stage.replaceAll("_"," ")}</p><h3 className="mt-1 font-bold">{artifact.title}</h3></div><p className="text-sm text-slate-500">{formatDate(artifact.recorded_at)} · version {artifact.version_number}</p></div>{worksheet&&<details className="mt-3 rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer font-semibold">View the actual submitted artifact</summary><EvidenceResponses responses={worksheet.responses}/></details>}</article>})}{!filteredArtifacts.length&&<p className="text-slate-600">No recorded artifacts match this selection.</p>}</div></section>
  </main></>;
}

function EvidencePanel({title,worksheet}:{title:string;worksheet?:Worksheet}){return <section className="rounded-2xl border border-slate-200 p-5"><h4 className="font-bold">{title}</h4>{worksheet?<><p className="mt-1 text-sm text-slate-500">Submitted {formatDate(worksheet.submitted_at)} · version {worksheet.attempt_number} · confidence {worksheet.confidence}/5</p><EvidenceResponses responses={worksheet.responses}/></>:<p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No {title.toLowerCase()} artifact has been submitted.</p>}</section>}
function EvidenceResponses({responses}:{responses:unknown}){const record=asRecord(responses);const keys=["mainTask","practicalApplication","knowledgeCheck","feedbackChecking","improvement","todayCan","difficult","improved","help","exitTicket"];return <dl className="mt-4 grid gap-3">{keys.filter(key=>key in record).map(key=><div key={key}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{formatKey(key)}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{String(record[key])||"No response recorded"}</dd></div>)}</dl>}
function asRecord(value:unknown):Record<string,unknown>{return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function formatKey(value:string){return value.replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("_"," ");}
function formatDate(value:string){return new Date(value).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"});}
function related<T>(value:T|T[]|null|undefined):T|undefined{return Array.isArray(value)?value[0]:value??undefined;}
