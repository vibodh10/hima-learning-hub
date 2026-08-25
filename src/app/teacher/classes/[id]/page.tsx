import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { AdaptiveHomeworkForm, BulkTeacherActionForm, ClassLifecycleForms, ClassSettingsForm, ExtendedClassLifecycleForms, PathwayThresholdForm, StartGroupJourneyForm, WeeklyPlanForm } from "@/components/class-forms";
import { CoinRulesForm } from "@/components/gamification-config-forms";
import { StudentInvitationForm } from "@/components/student-invitation-form";

type AttentionRow={learner_id:string;display_name:string;starting_score:number|null;current_score:number|null;progress_points:number|null;catch_up_status:string;outstanding_count:number;attention_status:string;attention_reason:string;ap_total:number;achievement_level:string|null};

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("teacher", "administrator");
  const { id } = await params;
  const supabase = await createClient();
  const { data: classData } = await supabase.from("classes")
    .select("id,name,course_id,academic_period_id,active_unit_id,starts_on,ends_on,weekly_learning_day,published,enrolment_code_hint,courses(title),enrolments(student_id,user_profiles!enrolments_student_id_fkey(display_name)),class_units(unit_id,active)")
    .eq("id", id).single();
  if (!classData) notFound();
  const [{ data: courses }, { data: units }, { data: periods }, { data: topics }, { data: teachers }, { data: otherClasses }] = await Promise.all([
    supabase.from("courses").select("id,title").eq("active", true).is("archived_at", null).order("title"),
    supabase.from("units").select("id,course_id,code,title,kind,initial_teaching").is("archived_at", null).order("sort_order"),
    supabase.from("academic_periods").select("id,name,kind,academic_years(name)").is("archived_at", null).order("starts_on"),
    supabase.from("topics").select("id,title,units(title)").eq("status","approved").is("archived_at",null).order("sort_order"),
    supabase.from("user_profiles").select("id,display_name").in("role",["teacher","administrator"]).is("archived_at",null).neq("id",actor.id).order("display_name"),
    supabase.from("classes").select("id,name").is("archived_at",null).neq("id",id).order("name"),
  ]);
  const selectedUnitIds = (classData.class_units ?? []).filter(unit => unit.active).map(unit => unit.unit_id);
  const [{ data: journeyTemplates }, { data: journeyPositions }, {data:attentionRows},{data:achievementRows}] = await Promise.all([
    selectedUnitIds.length
      ? supabase.from("learning_journey_templates")
        .select("id,unit_id,title,total_teaching_weeks,units(code,title)")
        .in("unit_id", selectedUnitIds).eq("status", "approved").is("archived_at", null)
      : Promise.resolve({ data: [] }),
    supabase.rpc("current_class_learning_journey", { class_uuid: id }),
    supabase.rpc("class_learner_attention",{class_uuid:id}),
    supabase.rpc("class_learner_achievement",{class_uuid:id}),
  ]);
  const journeyPosition = journeyPositions?.[0];
  const achievementByLearner=new Map(((achievementRows??[]) as {learner_id:string;ap_total:number;achievement_level:string|null}[]).map(row=>[row.learner_id,row]));
  const attention=((attentionRows??[]) as Omit<AttentionRow,"ap_total"|"achievement_level">[]).map(row=>({...row,
    ap_total:achievementByLearner.get(row.learner_id)?.ap_total??0,
    achievement_level:achievementByLearner.get(row.learner_id)?.achievement_level??null,
  }));
  const studentIds = (classData.enrolments ?? []).map(enrolment => enrolment.student_id);
  const [{ data: attempts }, { data: mastery }, { data: misconceptions }, { data: curriculumAttempts }] = studentIds.length ? await Promise.all([
    supabase.from("attempts").select("learner_id,activity_id,percentage,attempt_number,completed_at,activities(kind,learning_stage)").in("learner_id", studentIds).not("completed_at", "is", null).order("completed_at"),
    supabase.from("skill_mastery").select("learner_id,mastery_score,current_pathway,skills(title)").in("learner_id", studentIds),
    supabase.from("learner_misconceptions").select("learner_id,occurrence_count,resolved_at,misconceptions(title,skills(title))").in("learner_id", studentIds).order("occurrence_count", { ascending: false }),
    supabase.from("learner_curriculum_attempts").select("learner_id,kind,percentage,teacher_mark,completed_at").in("learner_id", studentIds).order("completed_at"),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const latestAttempts = latestByLearner(attempts ?? []);
  const latestCurriculumAttempts = latestByLearner(curriculumAttempts ?? []);
  const latestScores = studentIds.map(learnerId => {
    const curriculumAttempt = latestCurriculumAttempts.find(attempt => attempt.learner_id === learnerId);
    const legacyAttempt = latestAttempts.find(attempt => attempt.learner_id === learnerId);
    const attempt = curriculumAttempt ?? legacyAttempt;
    return attempt ? Number(attempt.percentage) : null;
  }).filter((score): score is number => score != null);
  const completedActivities = new Set((attempts ?? []).map(attempt => `${attempt.learner_id}:${attempt.activity_id}`)).size + (curriculumAttempts?.length ?? 0);
  const homeworkAttempts = attempts?.filter(attempt => related(attempt.activities)?.kind === "homework").length ?? 0;
  const average = latestScores.length ? Math.round(latestScores.reduce((sum, score) => sum + score, 0) / latestScores.length) : null;
  const supportSkills = mastery?.filter(skill => skill.current_pathway === "Support").length ?? 0;

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href="/dashboard">← Teacher dashboard</Link>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Class overview</p><h1 className="mt-2 text-4xl font-bold">{classData.name}</h1><p className="mt-2 text-slate-600">{related(classData.courses)?.title}</p></div><div className="flex flex-wrap items-center gap-3"><Link className="button-secondary" href={`/api/reports/classes/${id}`}>Class PDF</Link><Link className="button-secondary" href={`/api/reports/classes/${id}?format=csv`}>Class CSV</Link><p className="rounded-xl bg-slate-100 px-4 py-3 text-sm">Code hint: ends in <strong>{classData.enrolment_code_hint}</strong></p></div></div>

    <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Learners" value={String(studentIds.length)}/><Metric label="Activities completed" value={String(completedActivities)}/><Metric label="Latest average" value={average == null ? "Not available" : `${average}%`}/><Metric label="Homework attempts" value={String(homeworkAttempts)}/><Metric label="Skills requiring support" value={String(supportSkills)}/></section>

    {journeyPosition ? <section className="card mt-6" aria-labelledby="journey-position-title">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="eyebrow">Active group journey</p><h2 className="mt-2 text-2xl font-bold" id="journey-position-title">{journeyPosition.journey_title}</h2>
          <p className="mt-2 text-slate-600">Teaching Week {journeyPosition.teaching_week} of {journeyPosition.total_teaching_weeks}</p></div>
        <JourneyStatus status={journeyPosition.position_status}/>
      </div>
      {journeyPosition.position_status === "paused"
        ? <p className="mt-5 rounded-xl bg-sky-50 p-4 text-sm text-sky-950"><strong>Teaching timer paused:</strong> {journeyPosition.pause_reason}. It resumes on {formatDate(journeyPosition.next_teaching_on)}.</p>
        : journeyPosition.position_status === "completed"
          ? <p className="mt-5 rounded-xl bg-teal-50 p-4 text-sm text-teal-950">The 12-teaching-week sequence is complete. Historical evidence remains attached to this journey.</p>
          : <p className="mt-5 text-sm text-slate-600">The next teaching-week boundary is {formatDate(journeyPosition.next_teaching_on)}. Holiday and closure weeks are excluded.</p>}
    </section> : <StartGroupJourneyForm classId={id} templates={(journeyTemplates ?? []).map(template => ({
      id: template.id,
      title: template.title,
      unitCode: related(template.units)?.code ?? "",
      unitTitle: related(template.units)?.title ?? template.title,
      totalTeachingWeeks: template.total_teaching_weeks,
    }))}/>}
    <StudentInvitationForm classId={id}/>

    <section className="card mt-8 overflow-x-auto p-0"><div className="p-5"><p className="eyebrow">Who needs me?</p><h2 className="mt-2 text-2xl font-bold">Learner priorities</h2><p className="mt-2 text-sm text-slate-600">Intervention and action appear first. Every colour has a written status and evidence reason.</p></div><table className="w-full min-w-[1080px] text-left"><thead className="bg-slate-50 text-sm text-slate-600"><tr><th className="p-5">Learner</th><th className="p-5">Starting</th><th className="p-5">Current</th><th className="p-5">Progress</th><th className="p-5">Achievement</th><th className="p-5">Catch-up</th><th className="p-5">Status and reason</th><th className="p-5">Evidence</th></tr></thead>
      <tbody>{attention.map(row => <tr key={row.learner_id} className="border-t border-slate-200"><td className="p-5 font-semibold">{row.display_name}</td><td className="p-5">{row.starting_score==null?"Not recorded":`${row.starting_score}%`}</td><td className="p-5">{row.current_score==null?"Not recorded":`${row.current_score}%`}</td><td className="p-5">{row.progress_points==null?"Not comparable":`${Number(row.progress_points)>=0?"+":""}${row.progress_points} pp`}</td><td className="p-5"><strong>{row.ap_total} AP</strong><p className="mt-1 text-xs text-slate-500">{row.achievement_level??"Building toward Bronze"}</p></td><td className="p-5 capitalize">{row.catch_up_status.replaceAll("_"," ")}{row.outstanding_count?` · ${row.outstanding_count} outstanding`:""}</td><td className="p-5"><AttentionStatus status={row.attention_status}/><p className="mt-2 max-w-sm text-xs text-slate-600">{row.attention_reason}</p></td><td className="p-5"><div className="grid gap-2"><Link className="link" href={`/teacher/learners/${row.learner_id}`}>View full history</Link><Link className="link" href={`/teacher/learners/${row.learner_id}/evidence`}>Compare evidence</Link></div></td></tr>)}</tbody>
    </table>{!classData.enrolments?.length && <p className="p-6 text-slate-600">No active learners are enrolled yet.</p>}</section>

    <details className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <summary className="cursor-pointer text-lg font-bold text-slate-800">Advanced class administration</summary>
      <p className="mt-2 text-sm text-slate-600">Occasional setup, lifecycle and professional-judgement controls. These are not part of the routine teaching journey.</p>
      <ClassSettingsForm classData={classData} courses={courses ?? []} units={units ?? []} periods={periods ?? []} selectedUnitIds={selectedUnitIds}/>
      <ClassLifecycleForms classId={id}/>
      <ExtendedClassLifecycleForms classId={id} teachers={teachers??[]} otherClasses={otherClasses??[]} learners={(classData.enrolments??[]).map(enrolment=>({
        id:enrolment.student_id,displayName:related(enrolment.user_profiles)?.display_name??"Learner",
      }))}/>
      <WeeklyPlanForm classId={id}/>
      <PathwayThresholdForm classId={id}/>
      <CoinRulesForm classId={id}/>
      <AdaptiveHomeworkForm classId={id} topics={(topics??[]).map(topic=>({id:topic.id,title:topic.title,unitTitle:related(topic.units)?.title??"Unit / Content Area"}))}/>
      <BulkTeacherActionForm classId={id} learners={(classData.enrolments??[]).map(enrolment=>({id:enrolment.student_id,displayName:related(enrolment.user_profiles)?.display_name??"Learner"}))}/>
    </details>

    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card"><h2 className="text-2xl font-bold">Mastery distribution</h2><p className="mt-2 text-sm text-slate-600">Number of learner-skill records at each current pathway.</p><div className="mt-5 grid grid-cols-2 gap-3">{["Support","Core","Stretch","Mastery"].map(pathway => <Metric key={pathway} label={pathway} value={String(mastery?.filter(skill => skill.current_pathway === pathway).length ?? 0)}/>)}</div></div>
      <div className="card"><h2 className="text-2xl font-bold">Common misconceptions</h2><p className="mt-2 text-sm text-slate-600">Repeated patterns support re-teaching decisions and intervention review.</p><div className="mt-5 grid gap-3">{misconceptions?.length ? misconceptions.slice(0, 6).map((row, index) => <div className="rounded-xl bg-amber-50 p-4" key={index}><p className="font-semibold">{related(row.misconceptions)?.title}</p><p className="mt-1 text-sm text-amber-900">{related(related(row.misconceptions)?.skills)?.title} · {row.occurrence_count} occurrences · {row.resolved_at ? "resolved" : "open"}</p></div>) : <p className="text-slate-600">No tagged misconception evidence yet.</p>}</div></div>
    </section>
  </main></>;
}

function latestByLearner<T extends { learner_id: string; completed_at: string | null }>(attempts: T[]) {
  const latest = new Map<string, T>();
  for (const attempt of attempts) latest.set(attempt.learner_id, attempt);
  return [...latest.values()];
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function related<T>(value: T | T[] | null | undefined): T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined; }
function JourneyStatus({status}:{status:string}) {
  const label=status==="paused"?"Paused for non-teaching period":status==="completed"?"Journey complete":"In progress";
  const colour=status==="paused"?"bg-sky-100 text-sky-900":status==="completed"?"bg-teal-100 text-teal-900":"bg-emerald-100 text-emerald-900";
  return <span className={`rounded-full px-4 py-2 text-sm font-bold ${colour}`}>{label}</span>;
}
function formatDate(value:string|null) {
  return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}) : "not required";
}
function AttentionStatus({status}:{status:string}){
  const presentation:Record<string,{label:string;className:string}>={
    intervention_required:{label:"Intervention Required",className:"bg-red-100 text-red-900"},
    action_required:{label:"Action Required",className:"bg-orange-100 text-orange-950"},
    catch_up_required:{label:"Catch-up Required",className:"bg-amber-100 text-amber-950"},
    on_track:{label:"On Track",className:"bg-emerald-100 text-emerald-900"},
    exceeding:{label:"Exceeding",className:"bg-blue-100 text-blue-900"},
  };
  const value=presentation[status]??{label:status.replaceAll("_"," "),className:"bg-slate-100 text-slate-900"};
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${value.className}`}>{value.label}</span>;
}
