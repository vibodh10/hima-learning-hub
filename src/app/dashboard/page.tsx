import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { CreateClassForm, JoinClassForm } from "@/components/class-forms";
import { NewBadgeNotifications } from "@/components/achievement-celebration";
import { summariseActivityProgress } from "@/lib/activity-progress";
import { selectNextTarget } from "@/lib/target-priority";

const pilotLessonId = "61000000-0000-0000-0000-000000000001";
const pilotTopicId = "51000000-0000-0000-0000-000000000001";

type TeacherFilters={
  academicYear?:string;period?:string;course?:string;class?:string;unit?:string;
  topic?:string;skill?:string;pathway?:string;activityType?:string;
  dateFrom?:string;dateTo?:string;completionStatus?:string;
};
type ActivityState = {
  activity_id: string;
  sequence_order: number;
  state: string;
  status_detail: string;
  percentage: number|null;
};

export default async function DashboardPage({searchParams}:{searchParams:Promise<TeacherFilters>}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  const filters=await searchParams;
  return <><AppHeader name={profile.display_name} role={profile.role}/>
    {profile.role === "student"
      ? <StudentDashboard id={profile.id} name={profile.display_name}/>
      : <TeacherDashboard id={profile.id} role={profile.role} filters={filters}/>}
  </>;
}

async function StudentDashboard({ id, name }: { id: string; name: string }) {
  const supabase = await createClient();
  const [
    { data: progress }, { data: targets }, { data: enrolments }, { data: pilot },
    { data: mastery }, { data: badges }, { data: coins }, { data: retrieval },
    { data: streak }, { data: attempts }, { data: assessments },
    { data: comparisons }, { data: routes }, { data: courseStartingActivities },
  ] = await Promise.all([
    supabase.from("topic_progress").select("latest_score,best_score,current_pathway,topics(title)").eq("learner_id", id).limit(4),
    supabase.from("targets").select("id,target_text,target_date,status,reason,evidence,success_measure,unit_id,topic_id,skill_id,linked_activity_id,approved_by,approved_at,teacher_note,skills(title),activities:linked_activity_id(lesson_id)").eq("learner_id", id).in("status", ["proposed","approved","active","extended"]).order("target_date").limit(20),
    supabase.from("enrolments").select("class_id,classes(name,course_id,academic_year_id,active_unit_id,published,courses(title),class_units(active,units(id,code,title,kind)))").eq("student_id", id).is("archived_at", null).limit(1),
    supabase.from("lessons").select("id,title,topics(title),activities(id,title,learning_stage,assessment_kind,estimated_minutes,required)").eq("id", pilotLessonId).eq("status", "approved").maybeSingle(),
    supabase.from("skill_mastery").select("mastery_score,current_pathway,skills(title,topic_id)").eq("learner_id", id).order("mastery_score").limit(30),
    supabase.from("badge_awards").select("id,awarded_at,reason,evidence,notification_seen_at,badge_definitions(title,description,icon,one_time)").eq("learner_id", id).order("awarded_at", { ascending: false }).limit(20),
    supabase.from("coin_transactions").select("amount").eq("learner_id", id).in("transaction_status",["posted","refunded"]),
    supabase.from("retrieval_schedules").select("scheduled_for,status,topics(title),review_activity_id").eq("learner_id", id).in("status", ["scheduled", "available"]).order("scheduled_for").limit(1),
    supabase.from("practice_streaks").select("current_count,best_count").eq("learner_id", id).maybeSingle(),
    supabase.from("attempts").select("activity_id,completed_at").eq("learner_id", id).not("completed_at", "is", null),
    supabase.from("assessment_instances").select("id,kind,completed_at,activities(title)").eq("learner_id", id).order("completed_at", { ascending: false }),
    supabase.from("skill_progress_comparisons").select("starting_percentage,latest_percentage,improvement_points,status,evidence,skills(title)").eq("learner_id", id).order("updated_at", { ascending: false }),
    supabase.from("learner_routes").select("route,status,retention_due_on,topics(title)").eq("learner_id", id).eq("status", "active"),
    supabase.from("activities").select("id,title,estimated_minutes,lesson_id,lessons(id,title,status,topics(units(course_id)))").eq("assessment_kind","course_starting_point").eq("status","approved"),
  ]);

  const course = related(enrolments?.[0]?.classes);
  const courseStartActivity = courseStartingActivities?.find(activity =>
    related(related(related(activity.lessons)?.topics)?.units)?.course_id === course?.course_id
  );
  const courseStartLesson = related(courseStartActivity?.lessons);
  const classId = enrolments?.[0]?.class_id;
  const {data:pilotStates}=await supabase.rpc("learner_activity_states",{
    lesson_uuid:pilotLessonId,learner_uuid:id,
  });
  const pilotStateByActivity=new Map<string,ActivityState>(((pilotStates??[]) as ActivityState[]).map(state=>[state.activity_id,state]));
  const {data:calendarEvents}=course?.academic_year_id
    ? await supabase.from("academic_calendar_events")
      .select("id,title,kind,starts_on,ends_on,metadata")
      .eq("academic_year_id",course.academic_year_id)
      .is("archived_at",null).order("starts_on").limit(8)
    : {data:[]};
  const { data: allocations } = classId ? await supabase.from("activity_allocations")
    .select("id,release_at,deadline_at,required,allocated_pathway,activities(id,lesson_id,title,learning_stage,estimated_minutes)")
    .or(`learner_id.eq.${id},class_id.eq.${classId}`).is("archived_at", null).order("deadline_at") : { data: [] };
  const coinBalance = coins?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) ?? 0;
  const completedIds = new Set((attempts ?? []).map(attempt => attempt.activity_id));
  const allPilotActivities = ((pilot?.activities ?? []) as { id: string; title: string; learning_stage: string | null;assessment_kind:string|null; estimated_minutes: number; required: boolean }[]);
  const hasOfficialRetention=allPilotActivities.some(activity=>activity.assessment_kind==="retention_check");
  const pilotActivities = allPilotActivities
    .filter(activity=>!(hasOfficialRetention&&activity.learning_stage==="retrieval_review"&&!activity.assessment_kind))
    .sort((a,b)=>(pilotStateByActivity.get(a.id)?.sequence_order??99)-(pilotStateByActivity.get(b.id)?.sequence_order??99)||a.title.localeCompare(b.title));
  const pilotSummary=summariseActivityProgress(pilotActivities.map(activity=>{
    const state=pilotStateByActivity.get(activity.id);
    return{id:activity.id,published:true,archived:false,
      lockedFuture:state?.state==="Scheduled",inAssignedScope:true,testMode:false,
      required:activity.required,completed:["Completed","Mastery Demonstrated","Additional Practice Required"].includes(state?.state??""),
    };
  }));
  const assignedUnitIds=new Set(((course?.class_units??[]) as {active:boolean;units:{id:string}|{id:string}[]|null}[])
    .filter(item=>item.active).map(item=>related(item.units)?.id).filter((value):value is string=>Boolean(value)));
  const activeUnitId=course?.active_unit_id;
  const nextTarget=selectNextTarget(targets??[],assignedUnitIds,activeUnitId);
  const unseenBadges=(badges??[]).filter(award=>!award.notification_seen_at).map(award=>({
    id:award.id,title:related(award.badge_definitions)?.title??"Achievement",reason:award.reason,
  }));
  const academicMastery=(mastery??[]).filter(item=>related(item.skills)?.topic_id===pilotTopicId);
  const weakest = academicMastery[0];
  const recommendedStage = weakest?.current_pathway === "Support" ? "guided_practice" :
    weakest?.current_pathway === "Core" ? "core_practice" :
    weakest?.current_pathway === "Stretch" ? "challenge_practice" :
    weakest?.current_pathway === "Mastery" ? "mastery_check" : "guided_practice";
  const recommendedActivity = pilotActivities.find(activity => activity.learning_stage === recommendedStage);

  return <main className="shell py-10">
    {unseenBadges.length>0&&<NewBadgeNotifications awards={unseenBadges}/>}
    <p className="eyebrow">Your learning</p>
    <h1 className="mt-2 text-4xl font-bold">Good to see you, {name.split(" ")[0]}.</h1>
    <p className="mt-2 text-slate-600">{course ? `${related(course.courses)?.title ?? "Your course"} is ready.` : "Join your class with the enrolment code from your teacher."}</p>
    {!course && <JoinClassForm/>}

    <section className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Current pathway" value={progress?.[0]?.current_pathway ?? mastery?.[0]?.current_pathway ?? "Starting point"} description="The current difficulty level selected from your learning evidence."/>
      <Metric label="Latest topic score" value={progress?.[0] ? `${progress[0].latest_score}%` : "Not started"} description="Your latest completed formative activity score; this is not your skill mastery."/>
      <Metric label="Gold coins" value={String(coinBalance)}/>
      <Metric label="Practice streak" value={streak ? `${streak.current_count} learning days` : "Not started"}/>
    </section>

    {!assessments?.some(item=>item.kind==="course_starting_point")&&courseStartActivity&&courseStartLesson&&<section className="card mt-6 border-blue-200 bg-blue-50"><p className="eyebrow">Begin here</p><h2 className="mt-2 text-2xl font-bold">{courseStartLesson.title}</h2><p className="mt-2 text-slate-700">Record your broad digital knowledge, problem solving, prior experience, confidence, support needs and aspirations. This baseline is permanent and is not a grade.</p><Link className="button mt-4" href={`/learn/${courseStartLesson.id}/activities/${courseStartActivity.id}`}>Open course starting point →</Link></section>}

    {course&&<section className="card mt-6"><p className="eyebrow">Assigned curriculum</p><h2 className="mt-2 text-2xl font-bold">Your Units / Content Areas</h2><div className="mt-4 flex flex-wrap gap-2">{((course.class_units??[]) as {active:boolean;units:{id:string;code:string;title:string;kind:string}|{id:string;code:string;title:string;kind:string}[]|null}[]).filter(item=>item.active).map((item,index)=>{const unit=related(item.units);return unit?.code.match(/^(1|2|4|6|8|9)$/)?<Link className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-teal-100" href={`/curriculum/units/${unit.code}`} key={index}>{`Unit ${unit.code}: `}{unit.title} →</Link>:<span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold" key={index}>{unit?.code.match(/^\d+$/)?`Unit ${unit.code}: `:""}{unit?.title}</span>})}</div><p className="mt-3 text-sm text-slate-500">Open any active unit to choose a topic, complete its lesson and work towards the Challenge project.</p></section>}

    <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
      <div className="card">
        <p className="eyebrow">Continue learning</p>
        <h2 className="mt-3 text-2xl font-bold">{pilot?.title ?? "Python foundations: input, processing and output"}</h2>
        <p className="mt-3 leading-7 text-slate-600">{related(pilot?.topics)?.title ?? "Learn the topic, then move from guided practice to independent mastery."}</p>
        <Link className="button mt-6" href={`/learn/${pilotLessonId}`}>Open the Python lesson →</Link>
      </div>
      <div className="card">
        <h2 className="text-xl font-bold">Your next target</h2>
        <p className="mt-4 leading-7 text-slate-600">{nextTarget?.target_text ?? "Complete an activity in your active unit to generate an evidence-based, skill-specific target."}</p>
        {nextTarget&&<div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><p><strong>Skill:</strong> {related(nextTarget.skills)?.title??"Active-unit priority"}</p><p className="mt-1"><strong>Reason:</strong> {nextTarget.reason}</p><p className="mt-1"><strong>Evidence:</strong> {targetEvidence(nextTarget.evidence)}</p><p className="mt-1"><strong>Success:</strong> {nextTarget.success_measure??"Meet the percentage stated in the target."}</p><p className="mt-1"><strong>Deadline:</strong> {new Date(nextTarget.target_date).toLocaleDateString("en-GB")}</p></div>}
        {weakest && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><strong>Revisit:</strong> {related(weakest.skills)?.title} · {Math.round(Number(weakest.mastery_score))}% mastery</p>}
        {(nextTarget?.linked_activity_id||recommendedActivity) && <Link className="link mt-4 inline-block text-sm" href={`/learn/${related(nextTarget?.activities)?.lesson_id??pilotLessonId}/activities/${nextTarget?.linked_activity_id??recommendedActivity?.id}`}>Open linked practice →</Link>}
      </div>
    </section>

    {allocations?.length ? <section className="card mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Allocated learning</p><h2 className="mt-2 text-2xl font-bold">Due homework and classwork</h2></div><span className="text-sm text-slate-500">{allocations.filter(item => !completedIds.has(related(item.activities)?.id ?? "")).length} outstanding</span></div>
      <div className="mt-5 grid gap-3">{allocations.map(item => {
        const activity = related(item.activities);
        const completed = completedIds.has(activity?.id ?? "");
        const overdue = !completed && item.deadline_at && new Date(item.deadline_at) < new Date();
        return <Link key={item.id} href={`/learn/${activity?.lesson_id}/activities/${activity?.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:bg-teal-50"><div><p className="font-semibold">{activity?.title}</p><p className="mt-1 text-sm text-slate-500">{item.allocated_pathway} · {item.required ? "required" : "optional"} · due {item.deadline_at ? new Date(item.deadline_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "when ready"}</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${completed ? "bg-teal-100 text-teal-900" : overdue ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-950"}`}>{completed ? "Completed" : overdue ? "Overdue" : "Upcoming"}</span></Link>;
      })}</div>
    </section> : null}

    {calendarEvents?.length?<section className="card mt-6"><p className="eyebrow">Course calendar</p><h2 className="mt-2 text-2xl font-bold">Important dates</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{calendarEvents.map(event=><div className="rounded-xl border border-slate-200 p-4" key={event.id}><p className="text-xs font-bold uppercase tracking-wide text-teal-700">{event.kind.replaceAll("_"," ")}</p><p className="mt-1 font-semibold">{event.title}</p><p className="mt-1 text-sm text-slate-600">{new Date(event.starts_on).toLocaleDateString("en-GB")}{event.ends_on!==event.starts_on?` to ${new Date(event.ends_on).toLocaleDateString("en-GB")}`:""}</p><p className="mt-2 text-sm text-slate-500">{calendarNote(event.metadata)}</p></div>)}</div></section>:null}

    <section className="card mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">This week</p><h2 className="mt-2 text-2xl font-bold">Your practice path</h2></div><span className="text-sm text-slate-500">{pilotSummary.completed} of {pilotSummary.assigned} currently countable activities completed · {pilotSummary.percentage}% · {pilotSummary.required} required · {pilotSummary.optional} optional</span></div>
      <div className="mt-5 grid gap-3">{pilotActivities.map(activity => {
        const state=pilotStateByActivity.get(activity.id);
        const open=!state||["Available","Completed","Mastery Demonstrated","Additional Practice Required"].includes(state.state);
        const content=<><div><p className="font-semibold">{activity.title}</p><p className="text-sm text-slate-500">{activityStage(activity)} · {activity.estimated_minutes} minutes {activity.required ? "· required" : "· optional"}</p>{activity.learning_stage==="mastery_check"&&!activity.assessment_kind&&<p className="mt-1 text-xs font-semibold text-amber-900">Independent check with no hints. This confirms whether you are ready to move ahead.</p>}</div><span className={`rounded-full px-3 py-1 text-sm font-bold ${open?"bg-teal-100 text-teal-900":"bg-slate-100 text-slate-600"}`}>{state?state.percentage==null?state.status_detail:`${state.state} · ${Math.round(Number(state.percentage))}%`:"Available"}</span></>;
        return open?<Link key={activity.id} href={`/learn/${pilotLessonId}/activities/${activity.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:bg-teal-50">{content}</Link>:<div key={activity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">{content}</div>;
      })}</div>
    </section>

    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">Skill mastery</h2><span className="text-sm text-slate-500">{mastery?.length ?? 0} skills recorded</span></div>
        <div className="mt-5 grid gap-3">{academicMastery.length ? academicMastery.slice(0,6).map((skill, index) => <div key={index}><div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{related(skill.skills)?.title}</span><span>{Math.round(Number(skill.mastery_score))}% · {skill.current_pathway}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${Number(skill.mastery_score)}%` }}/></div></div>) : <p className="text-slate-600">Complete a practice activity to begin tracking each skill.</p>}</div>
      </div>
      <div className="card"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">Achievements</h2><Link className="link text-sm" href="/rewards">Rewards shop</Link></div>
        <div className="mt-5 grid gap-3">{badges?.length ? badges.slice(0,4).map(award => {const badge=related(award.badge_definitions);return <div data-achievement-badge key={award.id} className="flex gap-3 rounded-xl bg-amber-50 p-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-2xl" aria-label={`${badge?.title??"Achievement"} icon`}>{badgeIcon(badge?.icon)}</span><div><p className="font-semibold">{badge?.title}</p><p className="mt-1 text-sm text-amber-900">Awarded {new Date(award.awarded_at).toLocaleDateString("en-GB")}</p><p className="mt-1 text-xs text-amber-800">{award.reason} · {badge?.one_time?"one-time":"repeatable"}</p><p className="mt-1 text-xs text-amber-800"><strong>Evidence:</strong> {badgeEvidence(award.evidence)}</p></div></div>}) : <p className="text-slate-600">Your first learning badge will appear here.</p>}</div>
      </div>
    </section>

    {retrieval?.[0] && <section className="card mt-6 border-teal-200 bg-teal-50"><p className="eyebrow">Upcoming retrieval review</p><h2 className="mt-2 text-xl font-bold">{related(retrieval[0].topics)?.title}</h2><p className="mt-2 text-slate-700">Scheduled for {new Date(retrieval[0].scheduled_for).toLocaleDateString("en-GB")} · {retrieval[0].status}</p>{retrieval[0].review_activity_id && <Link className="button mt-4" href={`/learn/${pilotLessonId}/activities/${retrieval[0].review_activity_id}`}>Open retrieval review</Link>}</section>}

    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card"><p className="eyebrow">Starting and progress points</p><h2 className="mt-2 text-2xl font-bold">Progress from your original baseline</h2>
        <div className="mt-5 grid gap-3">{comparisons?.length ? comparisons.map((comparison,index) => {const startingCount=evidenceNumber(comparison.evidence,"starting_question_count");const progressCount=evidenceNumber(comparison.evidence,"progress_question_count");const startingSufficient=evidenceBoolean(comparison.evidence,"starting_sufficient");const progressSufficient=evidenceBoolean(comparison.evidence,"progress_sufficient");return <div className="rounded-xl border border-slate-200 p-4" key={index}><div className="flex flex-wrap justify-between gap-2"><strong>{related(comparison.skills)?.title}</strong><span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">{comparison.status}</span></div><p className="mt-2 text-sm text-slate-600">Starting point: {startingSufficient?`${comparison.starting_percentage}%, based on ${startingCount} questions`:startingCount>0?`Insufficient evidence: ${startingCount} mapped question${startingCount===1?"":"s"}`:"Not yet assessed"}</p><p className="mt-1 text-sm text-slate-600">Progress point: {comparison.latest_percentage==null?"Not yet assessed":progressSufficient?`${comparison.latest_percentage}%, based on ${progressCount} equivalent questions`:`Insufficient evidence: ${progressCount} mapped question${progressCount===1?"":"s"}`}</p>{comparison.improvement_points!=null&&startingSufficient&&progressSufficient&&<p className="mt-1 text-sm font-semibold">{Number(comparison.improvement_points)>=0?"+":""}{comparison.improvement_points} percentage points</p>}</div>}) : <p className="text-slate-600">Complete the course and unit starting points to create your permanent baseline.</p>}</div>
        <p className="mt-4 text-sm text-slate-500">{assessments?.length ?? 0} starting, progress or retention records stored.</p>
      </div>
      <div className="card"><p className="eyebrow">Adaptive route</p><h2 className="mt-2 text-2xl font-bold">{routes?.[0]?.route ?? "Full Path"}</h2><p className="mt-2 text-sm font-semibold text-teal-800">The amount of teaching and practice required for this topic.</p><p className="mt-3 text-slate-600">{routeMessage(routes?.[0]?.route)}</p>{routes?.[0]?.retention_due_on && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Retention check scheduled for {new Date(routes[0].retention_due_on).toLocaleDateString("en-GB")}.</p>}<p className="mt-4 text-sm text-slate-500">Routes: Full Path, Reduced Practice, Mastery Check Only, Fast-Tracked, or Teacher Override. This is separate from Support/Core/Stretch/Mastery difficulty.</p></div>
    </section>
  </main>;
}

async function TeacherDashboard({ id,role,filters }: { id: string;role:string;filters:TeacherFilters }) {
  const supabase = await createClient();
  const now=await currentTimestamp();
  const classesQuery=supabase.from("classes").select("id,name,course_id,academic_year_id,academic_period_id,published,enrolments(count),class_enrolments:enrolments(student_id),courses(title),class_units(unit_id,active,units(title))").is("archived_at", null);
  if(role!=="administrator")classesQuery.eq("teacher_id",id);
  const [
    { data: classes }, { data: courses }, { data: years }, { data: mastery },
    { data: misconceptions }, { data: badges }, { data: coins },
    {data:periods},{data:units},{data:topics},{data:skills},{data:attemptEvidence},
    {data:allocationEvidence},
    {data:assessmentEvidence},{data:progressComparisons},{data:targetEvidence},
    {data:teacherActionEvidence},{data:routeEvidence},
  ] = await Promise.all([
    classesQuery,
    supabase.from("courses").select("id,title,qualification_type,qualification_level,awarding_organisation,units(id,code,title,kind,initial_teaching,status)").eq("active", true).is("archived_at", null).order("title"),
    supabase.from("academic_years").select("id,name").is("archived_at", null).order("starts_on", { ascending: false }),
    supabase.from("skill_mastery").select("learner_id,skill_id,mastery_score,current_pathway,skills(topic_id)"),
    supabase.from("learner_misconceptions").select("occurrence_count,misconceptions(title,skills(title))").order("occurrence_count", { ascending: false }).limit(5),
    supabase.from("badge_awards").select("id"),
    supabase.from("coin_transactions").select("amount"),
    supabase.from("academic_periods").select("id,name,academic_year_id").is("archived_at",null).order("starts_on"),
    supabase.from("units").select("id,course_id,code,title").is("archived_at",null).order("sort_order"),
    supabase.from("topics").select("id,unit_id,title").is("archived_at",null).order("sort_order"),
    supabase.from("skills").select("id,topic_id,title").is("archived_at",null).order("sort_order"),
    supabase.from("attempts").select("learner_id,activity_id,started_at,completed_at,activities(kind)").order("started_at",{ascending:false}).limit(1000),
    supabase.from("activity_allocations").select("id,class_id,learner_id,activity_id,release_at,deadline_at,activities(kind)").is("archived_at",null).limit(1000),
    supabase.from("assessment_instances").select("learner_id,kind,completed_at").not("completed_at","is",null),
    supabase.from("skill_progress_comparisons").select("learner_id,improvement_points,status"),
    supabase.from("targets").select("learner_id,status,target_date,review_on").is("archived_at",null),
    supabase.from("teacher_actions").select("learner_id,review_on,outcome").is("archived_at",null),
    supabase.from("learner_routes").select("learner_id,route,status").eq("status","active"),
  ]);
  const latestAttemptByLearnerActivity=new Map<string,{started_at:string;completed_at:string|null}>();
  for(const attempt of attemptEvidence??[]){
    const key=`${attempt.learner_id}:${attempt.activity_id}`;
    if(!latestAttemptByLearnerActivity.has(key)) latestAttemptByLearnerActivity.set(key,attempt);
  }
  const classById=new Map((classes??[]).map(item=>[item.id,item]));
  const completionEvidence=(allocationEvidence??[]).flatMap(allocation=>{
    const learners=allocation.learner_id
      ? [allocation.learner_id]
      : (classById.get(allocation.class_id ?? "")?.class_enrolments??[]).map(row=>row.student_id);
    return learners.map(learnerId=>{
      const attempt=latestAttemptByLearnerActivity.get(`${learnerId}:${allocation.activity_id}`);
      const deadline=allocation.deadline_at?new Date(allocation.deadline_at).getTime():null;
      const completedAt=attempt?.completed_at?new Date(attempt.completed_at).getTime():null;
      const status=completedAt
        ? deadline&&completedAt>deadline?"late":"completed"
        : attempt?"started"
        : deadline&&deadline<now?"overdue":"not_attempted";
      return{classId:allocation.class_id,learnerId,activityId:allocation.activity_id,status,
        kind:related(allocation.activities)?.kind};
    });
  });
  const completionClassIds=new Set(completionEvidence
    .filter(row=>!filters.completionStatus
      ||filters.completionStatus==="assigned"
      ||row.status===filters.completionStatus)
    .map(row=>row.classId).filter(Boolean));
  const visibleClasses=(classes??[]).filter(item=>
    (!filters.academicYear||item.academic_year_id===filters.academicYear)&&
    (!filters.period||item.academic_period_id===filters.period)&&
    (!filters.course||item.course_id===filters.course)&&
    (!filters.class||item.id===filters.class)&&
    (!filters.completionStatus||completionClassIds.has(item.id))&&
    (!filters.unit||(item.class_units??[]).some(unit=>unit.active&&unit.unit_id===filters.unit))
  );
  const visibleLearners=new Set<string>();
  const filteredMastery=(mastery??[]).filter(item=>
    (!filters.pathway||item.current_pathway===filters.pathway)&&
    (!filters.skill||item.skill_id===filters.skill)&&
    (!filters.topic||related(item.skills)?.topic_id===filters.topic)
  );
  const filteredAttempts=(attemptEvidence??[]).filter(item=>
    item.completed_at&&
    (!filters.activityType||related(item.activities)?.kind===filters.activityType)&&
    (!filters.dateFrom||new Date(item.completed_at)>=new Date(`${filters.dateFrom}T00:00:00`))&&
    (!filters.dateTo||new Date(item.completed_at)<=new Date(`${filters.dateTo}T23:59:59`))
  );
  const filteredCompletionEvidence=completionEvidence.filter(row=>
    (!filters.completionStatus||filters.completionStatus==="assigned"||row.status===filters.completionStatus)&&
    (!filters.activityType||row.kind===filters.activityType)
  );
  filteredMastery.forEach(item=>visibleLearners.add(item.learner_id));
  const classCount = visibleClasses.length;
  const learnerCount = visibleClasses.reduce((count, item) => count + Number(item.enrolments?.[0]?.count ?? 0), 0);
  const supportCount = filteredMastery.filter(item => item.current_pathway === "Support").length;
  const masteryCount = filteredMastery.filter(item => item.current_pathway === "Mastery").length;
  const evidenceLearners=new Set((classes??[]).flatMap(item=>(item.class_enrolments??[]).map(row=>row.student_id)));
  const assessmentCount=(kind:string)=>new Set((assessmentEvidence??[])
    .filter(row=>evidenceLearners.has(row.learner_id)&&row.kind===kind)
    .map(row=>row.learner_id)).size;
  const completionCount=(kind:string)=>filteredCompletionEvidence
    .filter(row=>row.kind===kind&&["completed","late"].includes(row.status)).length;
  const improvementRows=(progressComparisons??[]).filter(row=>evidenceLearners.has(row.learner_id)&&row.improvement_points!=null);
  const routeCount=(route:string)=>new Set((routeEvidence??[])
    .filter(row=>evidenceLearners.has(row.learner_id)&&row.route===route)
    .map(row=>row.learner_id)).size;
  const todayIso=new Date(now).toISOString().slice(0,10);
  const activeTargets=(targetEvidence??[]).filter(row=>evidenceLearners.has(row.learner_id));
  const inactiveLearners=[...evidenceLearners].filter(learnerId=>
    !(attemptEvidence??[]).some(attempt=>attempt.learner_id===learnerId&&attempt.completed_at)
  ).length;
  const actionsAwaitingReview=(teacherActionEvidence??[]).filter(row=>
    evidenceLearners.has(row.learner_id)&&row.review_on&&row.review_on<=todayIso&&!row.outcome
  ).length;

  return <main className="shell py-10">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Teaching overview</p><h1 className="mt-2 text-4xl font-bold">Class progress at a glance</h1><p className="mt-2 text-slate-600">Academic evidence remains primary; gamification is shown separately.</p></div><div className="flex flex-wrap gap-3"><Link className="button-secondary" href="/teacher/sample-report">Preview sample reports</Link><Link className="button-secondary" href={`/learn/${pilotLessonId}`}>Preview Python lesson</Link><Link className="button" href="/teacher/content">Manage learning content</Link></div></div>
    <section className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Classes" value={String(classCount)}/><Metric label="Learners" value={String(learnerCount)}/><Metric label="Skills requiring support" value={String(supportCount)}/><Metric label="Skills at mastery" value={String(masteryCount)}/></section>

    <section className="card mt-6"><p className="eyebrow">Evidence signals</p><h2 className="mt-2 text-2xl font-bold">Completion, progress and action</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Signal label="Course starting point complete" value={assessmentCount("course_starting_point")}/>
      <Signal label="Unit starting point complete" value={assessmentCount("unit_starting_point")}/>
      <Signal label="Progress points complete" value={assessmentCount("progress_point")}/>
      <Signal label="Classwork complete" value={completionCount("in_class_practice")}/>
      <Signal label="Homework complete" value={completionCount("homework")}/>
      <Signal label="Overdue work" value={completionEvidence.filter(row=>row.status==="overdue").length} tone="risk"/>
      <Signal label="Significant improvement" value={improvementRows.filter(row=>Number(row.improvement_points)>=10).length} tone="good"/>
      <Signal label="No clear improvement" value={improvementRows.filter(row=>Number(row.improvement_points)<=0).length} tone="risk"/>
      <Signal label="Learners ready for Stretch" value={new Set(filteredMastery.filter(row=>row.current_pathway==="Stretch").map(row=>row.learner_id)).size}/>
      <Signal label="Learners ready for Mastery" value={new Set(filteredMastery.filter(row=>row.current_pathway==="Mastery").map(row=>row.learner_id)).size}/>
      <Signal label="Fast-tracked learners" value={routeCount("Fast-Tracked")} tone="good"/>
      <Signal label="Inactive learners" value={inactiveLearners} tone="risk"/>
      <Signal label="Targets due" value={activeTargets.filter(row=>["approved","active","extended"].includes(row.status)&&row.target_date>=todayIso).length}/>
      <Signal label="Targets achieved" value={activeTargets.filter(row=>row.status==="achieved").length} tone="good"/>
      <Signal label="Overdue targets" value={activeTargets.filter(row=>["approved","active","extended"].includes(row.status)&&row.target_date<todayIso).length} tone="risk"/>
      <Signal label="Actions awaiting review" value={actionsAwaitingReview} tone="risk"/>
    </div><p className="mt-4 text-sm text-slate-500">Counts are evidence records or distinct learners, not a single overall average. Open a class to drill down through learner and attempt history.</p></section>

    <form className="card mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" method="get">
      <FilterSelect label="Academic year" name="academicYear" value={filters.academicYear} options={(years??[]).map(item=>({id:item.id,title:item.name}))}/>
      <FilterSelect label="Term / semester" name="period" value={filters.period} options={(periods??[]).map(item=>({id:item.id,title:item.name}))}/>
      <FilterSelect label="Course" name="course" value={filters.course} options={(courses??[]).map(item=>({id:item.id,title:item.title}))}/>
      <FilterSelect label="Class" name="class" value={filters.class} options={(classes??[]).map(item=>({id:item.id,title:item.name}))}/>
      <FilterSelect label="Unit / Content Area" name="unit" value={filters.unit} options={(units??[]).map(item=>({id:item.id,title:`${item.code} · ${item.title}`}))}/>
      <FilterSelect label="Topic" name="topic" value={filters.topic} options={(topics??[]).map(item=>({id:item.id,title:item.title}))}/>
      <FilterSelect label="Skill" name="skill" value={filters.skill} options={(skills??[]).map(item=>({id:item.id,title:item.title}))}/>
      <FilterSelect label="Pathway" name="pathway" value={filters.pathway} options={["Support","Core","Stretch","Mastery"].map(item=>({id:item,title:item}))}/>
      <FilterSelect label="Activity type" name="activityType" value={filters.activityType} options={[["in_class_learning","Classroom learning"],["in_class_practice","Classwork"],["homework","Homework"],["revision","Revision"],["holiday_work","Holiday work"],["skills_practice","Practical skills"],["review_check","Review / progress check"]].map(([id,title])=>({id,title}))}/>
      <label className="grid gap-1 text-sm font-semibold">From date<input className="input" type="date" name="dateFrom" defaultValue={filters.dateFrom??""}/></label>
      <label className="grid gap-1 text-sm font-semibold">To date<input className="input" type="date" name="dateTo" defaultValue={filters.dateTo??""}/></label>
      <FilterSelect label="Completion status" name="completionStatus" value={filters.completionStatus} options={["assigned","started","completed","overdue","late","not_attempted"].map(item=>({id:item,title:item.replaceAll("_"," ")}))}/>
      <div className="flex items-end gap-3"><button className="button-secondary">Apply filters</button><Link className="link pb-3 text-sm" href="/dashboard">Clear</Link></div>
      <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">{filteredAttempts.length} completed attempts match the activity/date filters · {filteredCompletionEvidence.length} allocations match the completion filter · {visibleLearners.size} learners match the skill/pathway filters.</p>
    </form>

    <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <div className="card"><div><p className="eyebrow">Your classes</p><h2 className="mt-2 text-2xl font-bold">Groups and active courses</h2></div>
        <div className="mt-6 grid gap-3">{visibleClasses.length ? visibleClasses.map(item => <Link href={`/teacher/classes/${item.id}`} key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-5 hover:bg-teal-50"><div><p className="font-bold">{item.name}</p><p className="text-sm text-slate-500">{item.enrolments?.[0]?.count ?? 0} learners · {related(item.courses)?.title} · {item.published?"published":"draft setup"}</p><p className="mt-1 text-xs text-slate-500">{(item.class_units??[]).filter(unit=>unit.active).map(unit=>related(unit.units)?.title).filter(Boolean).join(", ")||"No active units"}</p></div><span className="font-bold text-teal-700">View class →</span></Link>) : <p className="rounded-2xl bg-slate-50 p-6 text-slate-600">No class matches these filters.</p>}</div>
        <CreateClassForm courses={courses ?? []} years={years ?? []}/>
      </div>
      <div className="grid gap-6">
        <div className="card"><h2 className="text-xl font-bold">Common misconceptions</h2><div className="mt-4 grid gap-3">{misconceptions?.length ? misconceptions.map((row, index) => <div key={index} className="rounded-xl bg-amber-50 p-4"><p className="font-semibold">{related(row.misconceptions)?.title}</p><p className="mt-1 text-sm text-amber-900">{related(related(row.misconceptions)?.skills)?.title} · seen {row.occurrence_count} times</p></div>) : <p className="text-slate-600">No misconception evidence recorded yet.</p>}</div></div>
        <div className="card"><h2 className="text-xl font-bold">Gamification overview</h2><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Badges awarded" value={String(badges?.length ?? 0)}/><Metric label="Net coins issued" value={String(coins?.reduce((sum, item) => sum + Number(item.amount), 0) ?? 0)}/></div></div>
      </div>
    </section>

    <section className="card mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Curriculum catalogue</p><h2 className="mt-2 text-2xl font-bold">Complete Units / Content Areas</h2></div><Link className="link" href="/teacher/content">Open curriculum selector →</Link></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">{courses?.map(course => {
        const units = (course.units ?? []) as { id: string; code: string; title: string; kind: string; initial_teaching: boolean; status: string }[];
        return <article className="rounded-2xl border border-slate-200 p-5" key={course.id}>
          <p className="text-sm font-semibold text-teal-700">{course.qualification_type} · {course.qualification_level}</p>
          <h3 className="mt-2 text-xl font-bold">{course.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{course.awarding_organisation} · {units.length} entries</p>
          <ol className="mt-4 max-h-80 space-y-2 overflow-auto pr-2 text-sm">{units.sort((a,b) => Number(a.code)-Number(b.code)).map(unit => <li className="rounded-lg bg-slate-50 px-3 py-2" key={unit.id}><strong>{unit.code.match(/^\d+$/) ? `${unit.code}. ` : ""}{unit.title}</strong><span className="ml-2 text-slate-500">{unit.kind.replaceAll("_"," ")}{unit.initial_teaching ? " · initial suggestion" : ""}</span></li>)}</ol>
        </article>;
      })}</div>
    </section>
  </main>;
}

function Metric({ label, value,description }: { label: string; value: string;description?:string }) { return <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p>{description&&<p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>}</div>; }
function Signal({label,value,tone="neutral"}:{label:string;value:number;tone?:"neutral"|"good"|"risk"}){
  const colour=tone==="good"?"bg-teal-50 text-teal-900":tone==="risk"?"bg-amber-50 text-amber-950":"bg-slate-50 text-slate-900";
  return <div className={`rounded-xl p-4 ${colour}`}><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}
function FilterSelect({label,name,value,options}:{label:string;name:string;value?:string;options:{id:string;title:string}[]}){
  return <label className="grid gap-1 text-sm font-semibold">{label}<select className="input capitalize" name={name} defaultValue={value??""}><option value="">All</option>{options.map(option=><option value={option.id} key={option.id}>{option.title}</option>)}</select></label>;
}
function related<T>(value: T | T[] | null | undefined): T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined; }
function calendarNote(metadata:unknown){
  return metadata&&typeof metadata==="object"&&"note" in metadata
    ? String((metadata as {note?:unknown}).note??""):"";
}
function badgeIcon(identifier?:string|null){
  const icons:Record<string,string>={python:"🐍",web:"🌐",practice:"🎯",footprints:"👣",database:"🗄️",game:"🎮",project:"📋",retrieval:"🧠",progress:"📈",mastery:"🏆",comeback:"↗️"};
  return icons[identifier??""]??"🏅";
}
function evidenceNumber(evidence:unknown,key:string){
  if(!evidence||typeof evidence!=="object"||!(key in evidence))return 0;
  const value=Number((evidence as Record<string,unknown>)[key]);
  return Number.isFinite(value)?value:0;
}
function evidenceBoolean(evidence:unknown,key:string){
  return Boolean(evidence&&typeof evidence==="object"&&(evidence as Record<string,unknown>)[key]);
}
function targetEvidence(value:unknown){
  if(!value||typeof value!=="object"||Array.isArray(value))return"No recorded evidence";
  const record=value as Record<string,unknown>;
  const score=record.percentage??record.score??record.mastery_score;
  const source=record.source??record.activity_title??record.assessment_kind;
  if(score!=null&&source)return`${String(source).replaceAll("_"," ")} · ${score}%`;
  if(source)return String(source).replaceAll("_"," ");
  if(score!=null)return`${score}%`;
  return"Recent active-unit learning evidence";
}
function badgeEvidence(value:unknown){
  if(!value||typeof value!=="object"||Array.isArray(value))return"Recorded award rule";
  const record=value as Record<string,unknown>;
  const source=record.activity_title??record.activity_id??record.topic_id??record.attempt_id;
  const score=record.percentage??record.score;
  if(source&&score!=null)return`${source} · ${score}%`;
  return source?String(source):"Recorded award rule";
}
async function currentTimestamp(){ return Date.now(); }
function formatStage(stage: string | null) { return (stage ?? "Practice").replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase()); }
function activityStage(activity:{learning_stage:string|null;assessment_kind:string|null}){
  if(activity.assessment_kind==="unit_starting_point")return"Unit Starting Point";
  if(activity.assessment_kind==="progress_point")return"Progress Point";
  if(activity.assessment_kind==="retention_check")return"Delayed Retention Check";
  return formatStage(activity.learning_stage);
}
function routeMessage(route?: string) {
  if (route === "Fast-Tracked") return "You have already demonstrated this skill. You can move directly to the challenge activities.";
  if (route === "Mastery Check Only") return "Complete this short mastery check to move ahead.";
  if (route === "Reduced Practice") return "A little selected practice will help secure this skill.";
  return "Complete the learning, worked examples, guided practice, core practice, mastery check and later retrieval review.";
}
