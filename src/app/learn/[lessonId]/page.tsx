import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type TeachingScreen = {
  id: string; sort_order: number; title: string; body: string; example: string | null;
  code_sample: string | null; definition: string | null; common_mistake: string | null; remember_text: string | null;
};
type WorkedExample = {
  id: string; sort_order: number; title: string; problem: string; planned_solution: string;
  worked_steps: unknown; code_sample: string | null; expected_output: string | null; common_error: string | null;
  skills: { title: string } | { title: string }[] | null;
};
type Activity = {
  id: string; title: string; learning_stage: string | null; pathway: string; instructions: string | null;
  assessment_kind: string | null;
  estimated_minutes: number; required: boolean; home_session_number: number | null;
  activity_questions: { count: number }[];
};
type ActivityState = {
  activity_id: string;
  state: string;
  status_detail: string;
};

const stageLabels: Record<string, string> = {
  guided_practice: "Guided practice",
  core_practice: "Core practice",
  challenge_practice: "Challenge practice",
  mastery_check: "Mastery check",
  retrieval_review: "Retrieval review",
};

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const actor = await requireRole("student", "teacher", "administrator");
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select(`
    id,title,remember,learn,worked_example,reflection_prompt,language,objectives,estimated_minutes,
    topics(title,units(code,title,courses(title))),
    teaching_screens(id,sort_order,title,body,example,code_sample,definition,common_mistake,remember_text),
    worked_examples(id,sort_order,title,problem,planned_solution,worked_steps,code_sample,expected_output,common_error,skills(title)),
    activities(id,title,learning_stage,assessment_kind,pathway,instructions,estimated_minutes,required,home_session_number,activity_questions(count))
  `).eq("id", lessonId).eq("status", "approved").is("archived_at", null).single();
  if (!data) notFound();

  const topic = related(data.topics);
  const unit = related(topic?.units);
  const course = related(unit?.courses);
  const screens = [...((data.teaching_screens ?? []) as TeachingScreen[])].sort((a, b) => a.sort_order - b.sort_order);
  const examples = [...((data.worked_examples ?? []) as WorkedExample[])].sort((a, b) => a.sort_order - b.sort_order);
  const allActivities=[...((data.activities ?? []) as Activity[])];
  const hasOfficialRetention=allActivities.some(activity=>activity.assessment_kind==="retention_check");
  const activities = allActivities
    .filter(activity=>!(hasOfficialRetention&&activity.learning_stage==="retrieval_review"&&!activity.assessment_kind))
    .sort((a, b) => stageOrder(a) - stageOrder(b));
  const{data:activityStates}=actor.role==="student"
    ?await supabase.rpc("learner_activity_states",{lesson_uuid:lessonId,learner_uuid:actor.id})
    :{data:[]};
  const statesByActivity=new Map<string,ActivityState>(((activityStates??[]) as ActivityState[]).map(state=>[state.activity_id,state]));
  const objectives = Array.isArray(data.objectives) ? data.objectives.map(String) : [];

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href="/dashboard">← Dashboard</Link>
    <header className="mt-8 max-w-4xl">
      <p className="eyebrow">{course?.title} · {unit?.code} {unit?.title}</p>
      <h1 className="mt-3 text-4xl font-bold">{data.title}</h1>
      <p className="mt-3 text-lg leading-8 text-slate-600">{topic?.title}</p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm"><Pill>{data.language ?? "Learning"} lesson</Pill><Pill>About {data.estimated_minutes} minutes</Pill><Pill>{screens.length} teaching screens</Pill><Pill>{activities.reduce((sum, activity) => sum + Number(activity.activity_questions?.[0]?.count ?? 0), 0)} practice interactions</Pill></div>
    </header>

    <section className="card mt-8 bg-teal-950 text-white">
      <p className="text-sm font-bold uppercase tracking-widest text-teal-200">Remember</p>
      <p className="mt-3 text-xl leading-8">{data.remember}</p>
      {objectives.length ? <div className="mt-6"><h2 className="font-bold">By the end, you should be able to:</h2><ul className="mt-3 grid gap-2 sm:grid-cols-2">{objectives.map(objective => <li key={objective}>✓ {objective}</li>)}</ul></div> : null}
    </section>

    <section className="mt-10">
      <p className="eyebrow">Learn</p><h2 className="mt-2 text-3xl font-bold">Build the ideas first</h2>
      <div className="mt-6 grid gap-6">{screens.map((screen, index) => <article className="card" key={screen.id}>
        <p className="text-sm font-bold text-teal-700">Screen {index + 1} of {screens.length}</p>
        <h3 className="mt-2 text-2xl font-bold">{screen.title}</h3>
        <p className="mt-4 leading-7 text-slate-700">{screen.body}</p>
        {screen.definition && <p className="mt-4 rounded-xl bg-teal-50 p-4"><strong>Definition:</strong> {screen.definition}</p>}
        {screen.code_sample && <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-slate-50"><code>{screen.code_sample}</code></pre>}
        {screen.example && <p className="mt-4 text-slate-700"><strong>Example:</strong> {screen.example}</p>}
        {screen.common_mistake && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-950"><strong>Common mistake:</strong> {screen.common_mistake}</p>}
        {screen.remember_text && <p className="mt-4 border-l-4 border-teal-600 pl-4 font-semibold">{screen.remember_text}</p>}
      </article>)}</div>
    </section>

    <section className="mt-12">
      <p className="eyebrow">Worked examples</p><h2 className="mt-2 text-3xl font-bold">See the process step by step</h2>
      <div className="mt-6 grid gap-6">{examples.map(example => <article className="card" key={example.id}>
        <p className="text-sm font-bold text-teal-700">{related(example.skills)?.title}</p>
        <h3 className="mt-2 text-2xl font-bold">{example.title}</h3>
        <p className="mt-4"><strong>Problem:</strong> {example.problem}</p>
        <p className="mt-3"><strong>Plan:</strong> {example.planned_solution}</p>
        <ol className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-5">{asStringArray(example.worked_steps).map((step, index) => <li key={step}><strong>{index + 1}.</strong> {step}</li>)}</ol>
        {example.code_sample && <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-slate-50"><code>{example.code_sample}</code></pre>}
        {example.expected_output && <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 p-4 text-sm"><strong>Expected output{"\n"}</strong>{example.expected_output}</pre>}
        {example.common_error && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-950"><strong>Watch for:</strong> {example.common_error}</p>}
      </article>)}</div>
    </section>

    <section className="mt-12">
      <p className="eyebrow">Practice path</p><h2 className="mt-2 text-3xl font-bold">Guided to independent mastery</h2>
      <p className="mt-3 max-w-3xl text-slate-600">The sequence moves from teaching and guided practice to independent mastery, an equivalent progress point, then a delayed retention check.</p>
      <div className="mt-6 grid gap-4">{activities.map(activity => {
        const state=statesByActivity.get(activity.id);
        const open=actor.role!=="student"||!state||["Available","Completed","Mastery Demonstrated","Additional Practice Required"].includes(state.state);
        return <article className="card flex flex-wrap items-center justify-between gap-5" key={activity.id}>
          <div><p className="text-sm font-bold text-teal-700">{activityLabel(activity)} · {activity.pathway}</p><h3 className="mt-1 text-xl font-bold">{activity.title}</h3><p className="mt-2 text-sm text-slate-600">{activity.instructions}</p>{activity.learning_stage==="mastery_check"&&!activity.assessment_kind&&<p className="mt-2 text-sm font-semibold text-amber-900">Independent check with no hints. This confirms whether you are ready to move ahead.</p>}<p className="mt-2 text-xs text-slate-500">{activity.activity_questions?.[0]?.count ?? 0} questions · about {activity.estimated_minutes} minutes {activity.required ? "· required" : "· optional"}</p></div>
          <div className="text-right"><span className={`mb-2 block rounded-full px-3 py-1 text-sm font-bold ${open?"bg-teal-50 text-teal-900":"bg-slate-100 text-slate-600"}`}>{state?.status_detail??(actor.role==="student"?"Available":"Staff preview")}</span>{open?<Link className="button" href={`/learn/${data.id}/activities/${activity.id}`}>{state?.state==="Completed"?"Review":"Open"} activity →</Link>:<span className="button-secondary cursor-not-allowed opacity-60">Locked</span>}</div>
        </article>;
      })}</div>
    </section>

    {data.reflection_prompt && <section className="card mt-10"><p className="eyebrow">Reflection</p><h2 className="mt-2 text-2xl font-bold">Check your confidence</h2><p className="mt-3 leading-7 text-slate-700">{data.reflection_prompt}</p></section>}
  </main></>;
}

function stageOrder(activity: Activity) {
  if(activity.assessment_kind==="unit_starting_point")return 1;
  if(activity.learning_stage==="guided_practice")return 4;
  if(activity.learning_stage==="core_practice")return 5;
  if(activity.learning_stage==="challenge_practice")return 6;
  if(activity.learning_stage==="mastery_check"&&!activity.assessment_kind)return 7;
  if(activity.assessment_kind==="progress_point")return 8;
  if(activity.assessment_kind==="retention_check"||activity.learning_stage==="retrieval_review")return 9;
  return 3;
}
function activityLabel(activity: Activity) {
  if(activity.assessment_kind==="unit_starting_point")return "Unit starting point";
  if(activity.assessment_kind==="progress_point")return "Progress point";
  if(activity.assessment_kind==="retention_check")return "Retention check";
  return stageLabels[activity.learning_stage??""]??activity.learning_stage??"Practice";
}
function asStringArray(value: unknown) { return Array.isArray(value) ? value.map(String) : []; }
function related<T>(value: T | T[] | null | undefined): T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined; }
function Pill({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{children}</span>; }
