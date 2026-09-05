import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { capitaliseFirst } from "@/lib/display-text";

export default async function PortfolioPage() {
  const actor = await requireRole("student");
  const supabase = await createClient();
  const [{ data: artifacts }, { data: worksheets }] = await Promise.all([
    supabase.from("learner_portfolio_artifacts")
      .select("id,unit_code,topic_code,stage,title,source_type,source_id,version_number,evidence,recorded_at")
      .eq("learner_id", actor.id).order("recorded_at", { ascending: false }),
    supabase.from("learner_topic_worksheets")
      .select("id,unit_code,topic_code,attempt_number,mode,evidence_stage,responses,confidence,submitted_at")
      .eq("learner_id", actor.id).order("submitted_at", { ascending: false }),
  ]);
  const worksheetById = new Map((worksheets ?? []).map(item => [item.id, item]));
  const comparisonKeys=[...new Set((worksheets??[]).filter(item=>["before","after"].includes(item.evidence_stage)).map(item=>`${item.unit_code}:${item.topic_code}`))];

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href="/dashboard">← My dashboard</Link>
    <header className="mt-8 max-w-4xl"><p className="eyebrow">My Computing Journey</p><h1 className="mt-2 text-4xl font-bold">Learning portfolio</h1><p className="mt-3 text-slate-600">A chronological record of your submitted worksheets, improvements, checks and achievement evidence. Earlier versions remain available.</p></header>
    {comparisonKeys.length>0&&<section className="mt-8"><p className="eyebrow">My progress evidence</p><h2 className="mt-2 text-2xl font-bold">Before and after</h2><div className="mt-5 grid gap-5">{comparisonKeys.map(key=>{const [unitCode,topicCode]=key.split(":");const topicWorks=(worksheets??[]).filter(item=>item.unit_code===unitCode&&item.topic_code===topicCode);const before=[...topicWorks].reverse().find(item=>item.evidence_stage==="before");const after=[...topicWorks].find(item=>item.evidence_stage==="after");return <article className="card" key={key}><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Unit {unitCode} · {topicCode}</p><h3 className="mt-2 text-xl font-bold">Work over time</h3><div className="mt-4 grid gap-4 lg:grid-cols-2"><PortfolioStage title="Before teaching" worksheet={before}/><PortfolioStage title="After teaching" worksheet={after}/></div></article>})}</div></section>}
    <section className="mt-8 grid gap-4">
      {artifacts?.length ? artifacts.map(artifact => {
        const worksheet = artifact.source_id ? worksheetById.get(artifact.source_id) : undefined;
        return <article className="card" key={artifact.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Unit {artifact.unit_code}{artifact.topic_code?` · ${artifact.topic_code}`:""} · {artifact.stage.replaceAll("_"," ")}</p><h2 className="mt-2 text-xl font-bold">{capitaliseFirst(artifact.title)}</h2><p className="mt-1 text-sm text-slate-500">{new Date(artifact.recorded_at).toLocaleString("en-GB")} · version {artifact.version_number}</p></div><span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold">{capitaliseFirst(artifact.source_type.replaceAll("_"," "))}</span></div>
          {worksheet&&<details className="mt-5 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-semibold">View submitted worksheet evidence</summary><dl className="mt-4 grid gap-4">{Object.entries(asRecord(worksheet.responses)).map(([key,value])=><div key={key}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{formatKey(key)}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{String(value)||"No response recorded"}</dd></div>)}</dl><p className="mt-4 text-sm font-semibold">Confidence: {worksheet.confidence}/5 · {worksheet.evidence_stage.replaceAll("_"," ")} · {worksheet.mode.replaceAll("_"," ")}</p></details>}
        </article>;
      }) : <div className="card"><h2 className="text-xl font-bold">Your portfolio is ready</h2><p className="mt-2 text-slate-600">Your first saved worksheet or assessment evidence will appear here. No result has been invented.</p></div>}
    </section>
  </main></>;
}

function asRecord(value:unknown):Record<string,unknown>{return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function formatKey(value:string){return capitaliseFirst(value.replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("_"," "));}
function PortfolioStage({title,worksheet}:{title:string;worksheet?:{responses:unknown;submitted_at:string;confidence:number}}){const responses=asRecord(worksheet?.responses);return <div className="rounded-xl border border-slate-200 p-4"><h4 className="font-bold">{title}</h4>{worksheet?<><p className="mt-1 text-xs text-slate-500">{new Date(worksheet.submitted_at).toLocaleString("en-GB")} · confidence {worksheet.confidence}/5</p><p className="mt-3 whitespace-pre-wrap text-sm"><strong>Main evidence:</strong> {String(responses.mainTask??responses.practicalApplication??"No main-task response recorded")}</p></>:<p className="mt-3 text-sm text-slate-600">Not yet submitted.</p>}</div>}
