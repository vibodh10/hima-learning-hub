import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PracticeForm, type PracticeQuestion } from "@/components/practice-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TestModePanel } from "@/components/test-mode-panel";

type ActivityQuestionRow = { sort_order: number; questions: PracticeQuestion | PracticeQuestion[] | null };
type ActivityState = { activity_id: string; state: string; status_detail: string };

export default async function ActivityPage({ params }: { params: Promise<{ lessonId: string; activityId: string }> }) {
  const actor = await requireRole("student", "teacher", "administrator");
  const { lessonId, activityId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("activities").select(`
    id,lesson_id,title,pathway,learning_stage,assessment_kind,instructions,estimated_minutes,max_attempts,required,
    lessons(title,topics(title)),
    activity_questions(sort_order,questions(id,kind,question_text,marks,hint,skills(title),question_options(id,option_text,sort_order)))
  `).eq("id", activityId).eq("lesson_id", lessonId).eq("status", "approved").is("archived_at", null).single();
  if (!data) notFound();

  const rows = [...((data.activity_questions ?? []) as ActivityQuestionRow[])].sort((a, b) => a.sort_order - b.sort_order);
  const questions = rows.map(row => related(row.questions)).filter((question): question is PracticeQuestion => Boolean(question));
  const lesson = related(data.lessons);
  const topic = related(lesson?.topics);
  const hintsAvailable = questions.some(question => Boolean(question.hint));
  const {data:siblingActivities}=await supabase.from("activities")
    .select("id,learning_stage,assessment_kind,title")
    .eq("lesson_id",lessonId).eq("status","approved").is("archived_at",null);
  const orderedSiblings=[...(siblingActivities??[])].sort((a,b)=>stageRank(a)-stageRank(b)||a.title.localeCompare(b.title));
  const currentIndex=orderedSiblings.findIndex(item=>item.id===activityId);
  const nextActivity=orderedSiblings[currentIndex+1];
  const{data:themeRewards}=actor.role!=="student"
    ?await supabase.from("reward_items").select("id,title,asset_config").in("kind",["profile_theme","dashboard_background"]).eq("enabled",true).is("archived_at",null).order("title")
    :{data:[]};
  const {data:studentStates}=actor.role==="student"
    ? await supabase.rpc("learner_activity_states",{lesson_uuid:lessonId,learner_uuid:actor.id})
    : {data:[]};
  const activityState=(studentStates as ActivityState[] | null)?.find(state=>state.activity_id===activityId);
  const canAttempt=!activityState||["Available","Completed","Mastery Demonstrated","Additional Practice Required"].includes(activityState.state);

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href={`/learn/${lessonId}`}>← Back to lesson</Link>
    <header className="mt-8 max-w-4xl">
      <p className="eyebrow">{topic?.title} · {formatStage(data.learning_stage)}</p>
      <h1 className="mt-3 text-4xl font-bold">{data.title}</h1>
      <p className="mt-3 leading-7 text-slate-600">{data.instructions}</p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <Pill>{questions.length} questions</Pill><Pill>About {data.estimated_minutes} minutes</Pill><Pill>{data.pathway} pathway</Pill><Pill>Up to {data.max_attempts} attempts</Pill>
      </div>
      {data.learning_stage === "mastery_check" && data.assessment_kind!=="unit_starting_point"&&<p className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-950"><strong>Independent check — no hints.</strong> This confirms whether you are ready to move ahead.</p>}
      {hintsAvailable && <p className="mt-5 rounded-xl bg-teal-50 p-4 text-teal-950">Hints are available when needed. Using a hint supports learning and is recorded so mastery reflects independent understanding.</p>}
      {actor.role==="student"&&activityState&&<p className={`mt-5 rounded-xl p-4 ${canAttempt?"bg-teal-50 text-teal-950":"bg-slate-100 text-slate-700"}`}><strong>{activityState.state}</strong> — {activityState.status_detail}</p>}
    </header>
    {actor.role==="student"
      ? canAttempt?<section className="mt-8"><PracticeForm activityId={data.id} questions={questions} assessmentKind={data.assessment_kind}/></section>
        :<section className="card mt-8"><h2 className="text-xl font-bold">This activity is not available yet</h2><p className="mt-2 text-slate-600">{activityState?.status_detail}</p><Link className="button-secondary mt-4" href={`/learn/${lessonId}`}>Return to the learning sequence</Link></section>
      :<TestModePanel activityId={activityId} nextHref={nextActivity?`/learn/${lessonId}/activities/${nextActivity.id}`:undefined} themePreviews={(themeRewards??[]).map(item=>({id:item.id,title:item.title,config:item.asset_config}))}/>}
  </main></>;
}

function formatStage(stage: string | null) {
  return (stage ?? "practice").replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}
function related<T>(value: T | T[] | null | undefined): T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined; }
function Pill({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{children}</span>; }
function stageRank(activity:{learning_stage:string|null;assessment_kind:string|null}){
  if(activity.assessment_kind==="unit_starting_point")return 1;
  if(activity.learning_stage==="guided_practice")return 4;
  if(activity.learning_stage==="core_practice")return 5;
  if(activity.learning_stage==="challenge_practice")return 6;
  if(activity.learning_stage==="mastery_check"&&!activity.assessment_kind)return 7;
  if(activity.assessment_kind==="progress_point")return 8;
  if(activity.assessment_kind==="retention_check"||activity.learning_stage==="retrieval_review")return 9;
  return 3;
}
