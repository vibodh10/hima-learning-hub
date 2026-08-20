import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { AdaptiveHomeworkForm, BulkTeacherActionForm, ClassLifecycleForms, ClassSettingsForm, ExtendedClassLifecycleForms, PathwayThresholdForm, WeeklyPlanForm } from "@/components/class-forms";
import { CoinRulesForm } from "@/components/gamification-config-forms";
import { StudentInvitationForm } from "@/components/student-invitation-form";

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
  const studentIds = (classData.enrolments ?? []).map(enrolment => enrolment.student_id);
  const [{ data: progress }, { data: attempts }, { data: mastery }, { data: misconceptions }, { data: curriculumAttempts }] = studentIds.length ? await Promise.all([
    supabase.from("topic_progress").select("learner_id,first_score,latest_score,best_score,current_pathway").in("learner_id", studentIds),
    supabase.from("attempts").select("learner_id,activity_id,percentage,attempt_number,completed_at,activities(kind,learning_stage)").in("learner_id", studentIds).not("completed_at", "is", null).order("completed_at"),
    supabase.from("skill_mastery").select("learner_id,mastery_score,current_pathway,skills(title)").in("learner_id", studentIds),
    supabase.from("learner_misconceptions").select("learner_id,occurrence_count,resolved_at,misconceptions(title,skills(title))").in("learner_id", studentIds).order("occurrence_count", { ascending: false }),
    supabase.from("learner_curriculum_attempts").select("learner_id,kind,percentage,teacher_mark,completed_at").in("learner_id", studentIds).order("completed_at"),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

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

  return <><AppHeader name={actor.role === "teacher" ? "Hima" : actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href="/dashboard">← Teacher dashboard</Link>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Class overview</p><h1 className="mt-2 text-4xl font-bold">{classData.name}</h1><p className="mt-2 text-slate-600">{related(classData.courses)?.title}</p></div><div className="flex flex-wrap items-center gap-3"><Link className="button-secondary" href={`/api/reports/classes/${id}`}>Class PDF</Link><Link className="button-secondary" href={`/api/reports/classes/${id}?format=csv`}>Class CSV</Link><p className="rounded-xl bg-slate-100 px-4 py-3 text-sm">Code hint: ends in <strong>{classData.enrolment_code_hint}</strong></p></div></div>

    <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Learners" value={String(studentIds.length)}/><Metric label="Activities completed" value={String(completedActivities)}/><Metric label="Latest average" value={average == null ? "—" : `${average}%`}/><Metric label="Homework attempts" value={String(homeworkAttempts)}/><Metric label="Skills requiring support" value={String(supportSkills)}/></section>

    <ClassSettingsForm
      classData={classData}
      courses={courses ?? []}
      units={units ?? []}
      periods={periods ?? []}
      selectedUnitIds={(classData.class_units ?? []).filter(unit => unit.active).map(unit => unit.unit_id)}
    />
    <StudentInvitationForm classId={id}/>
    <ClassLifecycleForms classId={id}/>
    <ExtendedClassLifecycleForms
      classId={id}
      teachers={teachers??[]}
      otherClasses={otherClasses??[]}
      learners={(classData.enrolments??[]).map(enrolment=>({
        id:enrolment.student_id,
        displayName:related(enrolment.user_profiles)?.display_name??"Learner",
      }))}
    />
    <WeeklyPlanForm classId={id}/>
    <PathwayThresholdForm classId={id}/>
    <CoinRulesForm classId={id}/>
    <AdaptiveHomeworkForm classId={id} topics={(topics??[]).map(topic=>({id:topic.id,title:topic.title,unitTitle:related(topic.units)?.title??"Unit / Content Area"}))}/>
    <BulkTeacherActionForm classId={id} learners={(classData.enrolments??[]).map(enrolment=>({id:enrolment.student_id,displayName:related(enrolment.user_profiles)?.display_name??"Learner"}))}/>

    <section className="card mt-8 overflow-x-auto p-0"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-sm text-slate-600"><tr><th className="p-5">Learner</th><th className="p-5">First score</th><th className="p-5">Latest score</th><th className="p-5">Pathway</th><th className="p-5">Lowest current skill</th><th className="p-5">Evidence</th></tr></thead>
      <tbody>{classData.enrolments?.map(enrolment => {
        const learnerProgress = progress?.find(row => row.learner_id === enrolment.student_id);
        const learnerCurriculum = curriculumAttempts?.filter(row => row.learner_id === enrolment.student_id) ?? [];
        const firstScore = learnerProgress?.first_score ?? learnerCurriculum[0]?.percentage;
        const latestScore = learnerCurriculum.at(-1)?.percentage ?? learnerProgress?.latest_score;
        const pathway = learnerProgress?.current_pathway ?? pathwayForScore(latestScore == null ? null : Number(latestScore));
        const learnerSkills = mastery?.filter(row => row.learner_id === enrolment.student_id).sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score));
        const lowest = learnerSkills?.[0];
        return <tr key={enrolment.student_id} className="border-t border-slate-200"><td className="p-5 font-semibold">{related(enrolment.user_profiles)?.display_name}</td><td className="p-5">{firstScore == null ? "Not started" : `${firstScore}%`}</td><td className="p-5">{latestScore == null ? "—" : `${latestScore}%`}</td><td className="p-5">{pathway ?? "—"}</td><td className="p-5">{lowest ? `${related(lowest.skills)?.title} · ${Math.round(Number(lowest.mastery_score))}%` : "—"}</td><td className="p-5"><Link className="link" href={`/teacher/learners/${enrolment.student_id}`}>View full history</Link></td></tr>;
      })}</tbody>
    </table>{!classData.enrolments?.length && <p className="p-6 text-slate-600">No active learners are enrolled yet.</p>}</section>

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
function pathwayForScore(score: number | null) {
  if (score == null) return null;
  if (score >= 85) return "Mastery";
  if (score >= 70) return "Stretch";
  if (score >= 50) return "Core";
  return "Support";
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function related<T>(value: T | T[] | null | undefined): T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined; }
