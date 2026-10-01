import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";

export default async function SowAssessmentReviewPage({params}:{params:Promise<{id:string}>}){
 await requireRole("teacher","administrator");const {id}=await params;const admin=createAdminClient();
 const {data:allowed}=await admin.rpc("can_manage_class",{class_uuid:id});if(!allowed)notFound();
 const [{data:group},{data:assessments}]=await Promise.all([
  admin.from("classes").select("name").eq("id",id).maybeSingle(),
  admin.from("sow_formative_assessments").select("id,title,purpose,questions,status,published_at,sow_formative_submissions(learner_id,responses,submitted_at,profiles!sow_formative_submissions_learner_id_fkey(display_name))").eq("class_id",id).order("created_at",{ascending:false})
 ]);
 if(!group)notFound();
 return <main className="shell max-w-6xl py-8"><Link className="link" href={`/teacher/classes/${id}`}>← Back to group</Link><p className="eyebrow mt-6">SOW formative assessments</p><h1 className="mt-2 text-3xl font-bold">{group.name}</h1>
  <div className="mt-6 grid gap-5">{(assessments??[]).map(a=>{const questions=Array.isArray(a.questions)?a.questions.map(String):[];return <article className="card" key={a.id}><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">{a.title}</h2><p className="mt-1 text-sm text-slate-600">{a.purpose}</p></div><span className="text-sm font-semibold capitalize">{a.status}</span></div>
   <div className="mt-5 grid gap-4">{(a.sow_formative_submissions??[]).length?(a.sow_formative_submissions??[]).map((s:any)=><section className="rounded-xl border border-slate-200 p-4" key={s.learner_id}><h3 className="font-bold">{Array.isArray(s.profiles)?s.profiles[0]?.display_name:s.profiles?.display_name??"Student"}</h3><p className="text-xs text-slate-500">{new Date(s.submitted_at).toLocaleString("en-GB")}</p><ol className="mt-3 grid gap-3">{questions.map((q:string,i:number)=><li key={i}><p className="text-sm font-semibold">{i+1}. {q}</p><p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm">{Array.isArray(s.responses)?String(s.responses[i]??""):""}</p></li>)}</ol></section>):<p className="text-sm text-slate-500">No student submissions yet.</p>}</div>
  </article>})}</div>
 </main>;
}