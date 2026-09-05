import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { RoleBanner } from "@/components/role-banner";
import { CreateClassForm } from "@/components/class-forms";
import { NewBadgeNotifications } from "@/components/achievement-celebration";
import { summariseActivityProgress } from "@/lib/activity-progress";
import { selectNextTarget } from "@/lib/target-priority";
import { topicByCode, unitByCode } from "@/lib/learning-catalog";
import { latestIncompleteCurriculumPosition } from "@/lib/learning-progress";
import { evidenceStageForMilestone, journeyWeekFor, nextJourneyMilestone } from "@/lib/unit-journeys";
import { scopedTeacherAttention, selectTeacherDashboardLearners } from "@/lib/teacher-dashboard-filters";
import { summariseTeacherOverview } from "@/lib/dashboard-summary";
import { selectStudentNextAction } from "@/lib/student-next-action";
import { selectTeacherNextAction } from "@/lib/teacher-next-action";
import {
  latestSavedLearningResume,
  selectDatabaseActivityContinuation,
} from "@/lib/database-learning-continuation";
import { matchCompletedAllocationIds } from "@/lib/class-report-model";
import { formatWeeklyLearningDays } from "@/lib/weekly-schedule";
import { hasCompleteUnitStartingPoint } from "@/lib/unit-starting-point";
import { isConfiguredUnitCode } from "@/lib/curriculum-unit-code";
import { classInvitationReadiness } from "@/lib/class-invitation-readiness";
import { TeacherGroupCard } from "@/components/teacher-group-card";
import { StudentEnrolmentSummary } from "@/components/student-enrolment-summary";
import { capitaliseFirst } from "@/lib/display-text";
import { TeacherPriorityList } from "@/components/teacher-priority-list";

const pilotLessonId = "61000000-0000-0000-0000-000000000001";
const pilotTopicId = "51000000-0000-0000-0000-000000000001";

type TeacherFilters={
  academicYear?:string;period?:string;course?:string;class?:string;unit?:string;
  topic?:string;skill?:string;student?:string;pathway?:string;activityType?:string;
  dateFrom?:string;dateTo?:string;completionStatus?:string;
};
type ActivityState = {
  activity_id: string;
  sequence_order: number;
  state: string;
  status_detail: string;
  percentage: number|null;
};
type CatchUpStatus = {
  catch_up_id:string;unit_code:string;topic_code:string;status:string;
  opened_teaching_week:number;current_teaching_week:number;
};
type AchievementSummary={ap_total:number;current_level_code:string|null;current_level_title:string|null;current_level_message:string|null;next_level_title:string|null;next_threshold:number|null;points_to_next:number;certificate_status:string|null};
type Recognition={id:string;title:string;message:string;recognised_at:string};
type TeacherAttentionRow={classId:string;className:string;learner_id:string;display_name:string;current_score:number|null;progress_points:number|null;catch_up_status:string;outstanding_count:number;attention_status:string;attention_reason:string;ap_total:number;achievement_level:string|null;next_level:string|null;points_to_next:number;certificate_status:string|null};
type TeacherAttentionDb=Omit<TeacherAttentionRow,"classId"|"className"|"ap_total"|"achievement_level"|"next_level"|"points_to_next"|"certificate_status">;
type TeacherAchievementDb=Pick<TeacherAttentionRow,"learner_id"|"ap_total"|"achievement_level"|"next_level"|"points_to_next"|"certificate_status">;
type TeacherJourneySignal={classId:string;className:string;unitCode:string;teachingWeek:number;positionStatus:string;nextTeachingOn:string|null};

export default async function DashboardPage({searchParams}:{searchParams:Promise<TeacherFilters>}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  const filters=await searchParams;
  return <><AppHeader name={profile.display_name} role={profile.role}/>
    {profile.role === "student"
      ? <StudentDashboard id={profile.id} name={profile.display_name}/>
      : profile.role === "teacher"
        ? <TeacherHomeDashboard/>
        : <AdministratorDashboard role={profile.role} filters={filters}/>}
  </>;
}

async function StudentDashboard({ id, name }: { id: string; name: string }) {
  const supabase = await createClient();
  const now=await currentTimestamp();
  const [
    { data: progress }, { data: targets }, { data: enrolments }, { data: pilot },
    { data: mastery }, { data: badges }, { data: coins }, { data: retrieval },
    { data: streak }, { data: attempts }, { data: assessments },
    { data: comparisons }, { data: routes }, { data: courseStartingActivities }, { data: recentFeedback },
    { data: journeyWorksheets }, { data: curriculumProgressRows }, { data: curriculumAttempts },
    { data: savedDatabasePosition },
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
    supabase.from("attempts").select("activity_id,allocation_id,completed_at").eq("learner_id", id).not("completed_at", "is", null),
    supabase.from("assessment_instances").select("id,kind,completed_at,activities(title)").eq("learner_id", id).order("completed_at", { ascending: false }),
    supabase.from("skill_progress_comparisons").select("starting_percentage,latest_percentage,improvement_points,status,evidence,skills(title)").eq("learner_id", id).order("updated_at", { ascending: false }),
    supabase.from("learner_routes").select("route,status,retention_due_on,topics(title)").eq("learner_id", id).eq("status", "active"),
    supabase.from("activities").select("id,title,estimated_minutes,lesson_id,lessons(id,title,status,topics(units(course_id)))").eq("assessment_kind","course_starting_point").eq("status","approved"),
    supabase.from("formative_response_reviews").select("id,status,feedback,reviewed_at,attempt_answers(feedback,questions(question_text),attempts(activities(title)))").eq("learner_id",id).not("reviewed_at","is",null).order("reviewed_at",{ascending:false}).limit(3),
    supabase.from("learner_topic_worksheets").select("id,unit_code,topic_code,evidence_stage,submitted_at").eq("learner_id",id).order("submitted_at",{ascending:true}),
    supabase.from("learner_curriculum_progress").select("unit_code,topic_code,topic_started_at,lesson_completed_at,current_section,practice_score,mastery_score,independent_attempts,evidence,updated_at").eq("learner_id",id),
    supabase.from("learner_curriculum_attempts").select("id,kind,unit_code,topic_code,percentage,completed_at").eq("learner_id",id).order("completed_at",{ascending:false}).limit(100),
    supabase.from("learner_activity_positions").select("lesson_id,activity_id,last_opened_at,activities(id,title,lesson_id,lessons(id,title,topics(unit_id,units(id,code,title))))").eq("learner_id",id).maybeSingle(),
  ]);

  const course = related(enrolments?.[0]?.classes);
  if (!course) {
    return <main className="shell py-10">
      <RoleBanner role="student" />
      <div className="mt-8 max-w-3xl">
        <p className="eyebrow">Student dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">Welcome, {name.split(" ")[0]}.</h1>
      </div>
      <section className="card mt-8 max-w-3xl border-blue-200 bg-blue-50" aria-labelledby="no-course-title">
        <p className="eyebrow">Next step</p>
        <h2 className="mt-2 text-2xl font-bold" id="no-course-title">No course assigned yet</h2>
        <p className="mt-3 leading-7 text-slate-700">Your account is active, but it is not currently enrolled in a group. Ask your teacher for the current group registration link, or ask them to retry your SCCB email invitation. Your course, assessments and progress will appear after you join.</p>
      </section>
    </main>;
  }
  const courseStartActivity = courseStartingActivities?.find(activity =>
    related(related(related(activity.lessons)?.topics)?.units)?.course_id === course?.course_id
  );
  const courseStartLesson = related(courseStartActivity?.lessons);
  const classId = enrolments?.[0]?.class_id;
  const {data:journeyPositions}=classId
    ? await supabase.rpc("current_class_learning_journey",{class_uuid:classId})
    : {data:[]};
  const journeyPosition=journeyPositions?.[0];
  const [{data:catchUpStatuses},{data:achievementRows},{data:recognitionRows}]=await Promise.all([
    supabase.rpc("my_catch_up_status"),
    supabase.rpc("learner_achievement_summary",{learner_uuid:id}),
    supabase.from("learner_recognitions").select("id,title,message,recognised_at").eq("learner_id",id).order("recognised_at",{ascending:false}).limit(4),
  ]);
  const catchUps=(catchUpStatuses??[]) as CatchUpStatus[];
  const achievement=(achievementRows?.[0]??{ap_total:0,current_level_code:null,current_level_title:null,current_level_message:null,next_level_title:"Bronze",next_threshold:25,points_to_next:25,certificate_status:null}) as AchievementSummary;
  const recognitions=(recognitionRows??[]) as Recognition[];
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
    .select("id,learner_id,activity_id,release_at,deadline_at,required,allocated_pathway,class_scope_source,activities(id,lesson_id,title,learning_stage,estimated_minutes)")
    .eq("class_id",classId).or(`learner_id.is.null,learner_id.eq.${id}`)
    .is("archived_at", null).order("deadline_at") : { data: [] };
  const coinBalance = coins?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) ?? 0;
  const completedAllocationIds=matchCompletedAllocationIds(
    (allocations??[]).map(item=>({
      id:item.id,learnerId:item.learner_id,activityId:item.activity_id,
      releaseAt:item.release_at,deadlineAt:item.deadline_at,required:item.required,
      classScopeSource:item.class_scope_source,
    })),
    (attempts??[]).map(attempt=>({
      learnerId:id,activityId:attempt.activity_id,
      allocationId:attempt.allocation_id,completedAt:String(attempt.completed_at),
    })),
  );
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
  const activeUnit=((course?.class_units??[]) as {active:boolean;units:{id:string;code:string;title:string}|{id:string;code:string;title:string}[]|null}[])
    .map(item=>related(item.units)).find(unit=>unit?.id===activeUnitId);
  const activeUnitCode=activeUnit?.code;
  const activeCatalogUnit=activeUnitCode?unitByCode(activeUnitCode):undefined;
  const activeUnitStartingPointComplete=activeCatalogUnit
    ? hasCompleteUnitStartingPoint(
      curriculumProgressRows??[],
      activeCatalogUnit.code,
      activeCatalogUnit.topics.map(topic=>topic.code),
    )
    : false;
  const savedDatabaseActivity=related(savedDatabasePosition?.activities);
  const savedDatabaseLesson=related(savedDatabaseActivity?.lessons);
  const savedDatabaseTopic=related(savedDatabaseLesson?.topics);
  const savedDatabaseUnit=related(savedDatabaseTopic?.units);
  const databasePositionInScope=Boolean(
    savedDatabaseActivity?.id&&savedDatabaseLesson?.id&&savedDatabaseUnit?.id&&
    assignedUnitIds.has(savedDatabaseUnit.id),
  );
  const [{data:savedLessonActivities},{data:savedActivityStates}]=databasePositionInScope
    ? await Promise.all([
      supabase.from("activities").select("id,title").eq("lesson_id",savedDatabaseLesson!.id)
        .eq("status","approved").is("archived_at",null),
      supabase.rpc("learner_activity_states",{lesson_uuid:savedDatabaseLesson!.id,learner_uuid:id}),
    ])
    : [{data:[]},{data:[]}];
  const savedDatabaseContinuation=databasePositionInScope
    ? selectDatabaseActivityContinuation({
      savedActivityId:savedDatabasePosition!.activity_id,
      activities:savedLessonActivities??[],
      states:(savedActivityStates??[]) as ActivityState[],
    })
    : null;
  const currentJourneyWeek=activeUnitCode&&journeyPosition
    ? journeyWeekFor(activeUnitCode,Number(journeyPosition.teaching_week))
    : undefined;
  const upcomingProgressCheck=activeUnitCode&&journeyPosition
    ? nextJourneyMilestone(activeUnitCode,Number(journeyPosition.teaching_week))
    : undefined;
  const currentCurriculumProgress=activeUnitCode&&currentJourneyWeek
    ? curriculumProgressRows?.find(item=>item.unit_code===activeUnitCode&&item.topic_code===currentJourneyWeek.topicCode)
    : undefined;
  const unitStartingPoint=activeUnitCode
    ? curriculumAttempts?.find(item=>item.kind==="unit_starting_point"&&item.unit_code===activeUnitCode)
    : undefined;
  const milestoneStages=[
    {stage:"before",label:"Baseline",week:1},
    {stage:"progress_check_1",label:"Progress Check 1",week:6},
    {stage:"progress_check_2",label:"Progress Check 2",week:10},
    {stage:"after",label:"Final",week:12},
  ];
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
  const recommendedUnit4Activity=activeUnitCode==="4"?recommendedActivity:undefined;
  const linkedTargetActivityId=nextTarget?.linked_activity_id??recommendedUnit4Activity?.id;
  const linkedTargetLessonId=related(nextTarget?.activities)?.lesson_id??(recommendedUnit4Activity?pilotLessonId:null);
  const savedCurriculumPosition=latestIncompleteCurriculumPosition(curriculumProgressRows??[]);
  const savedCurriculumTopic=savedCurriculumPosition?topicByCode(savedCurriculumPosition.unitCode,savedCurriculumPosition.topicCode):undefined;
  const savedCurriculumUnit=savedCurriculumPosition?unitByCode(savedCurriculumPosition.unitCode):undefined;
  const savedModuleNumber=savedCurriculumUnit&&savedCurriculumTopic
    ? savedCurriculumUnit.topics.findIndex(item=>item.code===savedCurriculumTopic.code)+1
    : null;
  const savedSection=savedCurriculumPosition?.section??"lesson:1";
  const savedCurriculumHref=savedCurriculumPosition
    ? savedSection==="practice"
      ? `/curriculum/units/${savedCurriculumPosition.unitCode}/topics/${encodeURIComponent(savedCurriculumPosition.topicCode)}/practice`
      : `/curriculum/units/${savedCurriculumPosition.unitCode}/topics/${encodeURIComponent(savedCurriculumPosition.topicCode)}`
    : null;
  const curriculumResume=savedCurriculumPosition&&savedCurriculumTopic&&savedCurriculumHref?{
    title:`Continue Module ${savedModuleNumber}: ${capitaliseFirst(savedCurriculumTopic.title)}`,
    detail:savedSection==="practice"
      ? "Resume the adaptive questions from your saved module position."
      : `Resume ${savedSection.startsWith("lesson:")?`lesson card ${savedSection.slice(7)}`:"this module"} from your saved account position.`,
    href:savedCurriculumHref,
    updatedAt:savedCurriculumPosition.updatedAt,
  }:undefined;
  const databaseResume=savedDatabaseContinuation&&savedDatabaseLesson?{
    title:`Continue ${capitaliseFirst(savedDatabaseLesson.title)}`,
    detail:savedDatabaseContinuation.activityId===savedDatabasePosition?.activity_id
      ? savedDatabaseContinuation.state==="Additional Practice Required"
        ? `${capitaliseFirst(savedDatabaseContinuation.activityTitle)} needs another attempt before you move on.`
        : `Resume ${capitaliseFirst(savedDatabaseContinuation.activityTitle)}, the database activity you last opened.`
      : `Your last activity is complete. Continue with ${capitaliseFirst(savedDatabaseContinuation.activityTitle)}, the next available step.`,
    href:`/learn/${savedDatabaseLesson.id}/activities/${savedDatabaseContinuation.activityId}`,
    updatedAt:savedDatabasePosition!.last_opened_at,
  }:undefined;
  const savedResume=latestSavedLearningResume(curriculumResume,databaseResume);
  const studentNextAction=selectStudentNextAction({
    startingPoint: activeCatalogUnit&&!activeUnitStartingPointComplete
      ? {
        title:`Unit ${activeCatalogUnit.code} starting point`,
        detail:`Complete the independent starting point for ${capitaliseFirst(activeCatalogUnit.title)}. It changes the support and challenge inside the class topic; it does not move you away from your group’s teaching week.`,
        href:`/curriculum/units/${activeCatalogUnit.code}/starting-point`,
      }
      : !assessments?.some(item=>item.kind==="course_starting_point")&&courseStartActivity&&courseStartLesson
        ? {
        title:capitaliseFirst(courseStartLesson.title),
        detail:"Create your permanent course baseline. This records prior knowledge but does not change your assigned unit or class teaching week.",
        href:`/learn/${courseStartLesson.id}/activities/${courseStartActivity.id}`,
      }
      : undefined,
    catchUps:catchUps.map(item=>{
      const topic=topicByCode(item.unit_code,item.topic_code);
      return{
        title:`Unit ${item.unit_code} · ${capitaliseFirst(topic?.title??item.topic_code)}`,
        href:`/curriculum/units/${item.unit_code}/topics/${encodeURIComponent(item.topic_code)}?catchup=1#worksheet`,
        status:item.status,
      };
    }),
    allocations:(allocations??[]).flatMap(item=>{
      const activity=related(item.activities);
      return activity?.id&&activity.lesson_id?[{
        title:capitaliseFirst(activity.title),
        href:`/learn/${activity.lesson_id}/activities/${activity.id}`,
        completed:completedAllocationIds.has(item.id),
        deadlineAt:item.deadline_at,
      }]:[];
    }),
    resume:savedResume,
    journey:currentJourneyWeek&&activeUnitCode?{
      title:capitaliseFirst(currentJourneyWeek.title),
      detail:currentJourneyWeek.focus,
      href:`/curriculum/units/${activeUnitCode}/topics/${encodeURIComponent(currentJourneyWeek.topicCode)}?stage=${evidenceStageForMilestone(currentJourneyWeek.milestone)}#worksheet`,
    }:undefined,
    target:linkedTargetActivityId&&linkedTargetLessonId?{
      title:capitaliseFirst(nextTarget?.target_text??recommendedUnit4Activity?.title??"Targeted practice"),
      detail:nextTarget?.reason??"Use this practice to strengthen the skill your recent evidence identified.",
      href:`/learn/${linkedTargetLessonId}/activities/${linkedTargetActivityId}`,
    }:undefined,
    unit:activeUnit?{
      title:`Unit ${activeUnit.code}: ${capitaliseFirst(activeUnit.title)}`,
      detail:"Open your assigned unit to choose the next available topic and continue from your saved position.",
      href:isConfiguredUnitCode(activeUnit.code)?`/curriculum/units/${activeUnit.code}`:"/curriculum",
    }:undefined,
    lesson:pilot&&activeUnitCode==="4"?{
      title:capitaliseFirst(pilot.title),
      detail:capitaliseFirst(related(pilot.topics)?.title??"Continue the approved lesson and practice sequence."),
      href:`/learn/${pilotLessonId}`,
    }:undefined,
    now,
  });

  return <main className="shell py-10">
    {unseenBadges.length>0&&<NewBadgeNotifications awards={unseenBadges}/>}
    <RoleBanner role="student" />
    <div className="mt-8">
      <p className="eyebrow">Student dashboard</p>
      <h1 className="mt-2 text-4xl font-bold">Good to see you, {name.split(" ")[0]}.</h1>
      <p className="mt-2 text-slate-600">{capitaliseFirst(related(course.courses)?.title ?? "Your course")} is ready. Start with the next action shown below.</p>
    </div>

    <StudentEnrolmentSummary
      groupName={course.name}
      courseTitle={capitaliseFirst(related(course.courses)?.title ?? "Your assigned course")}
    />

    {studentNextAction?<section className="card mt-8 border-teal-200 bg-teal-50" aria-labelledby="continue-learning-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl"><p className="eyebrow">{studentNextAction.eyebrow}</p><h2 className="mt-2 text-3xl font-bold" id="continue-learning-title">{studentNextAction.title}</h2><p className="mt-3 leading-7 text-slate-700">{studentNextAction.detail}</p></div>
        {studentNextAction.meta&&<span className="rounded-full bg-white px-3 py-2 text-sm font-bold text-teal-900">{studentNextAction.meta}</span>}
      </div>
      <Link className="button mt-6 min-w-40 text-center" href={studentNextAction.href}>{studentNextAction.label} →</Link>
      <p className="mt-3 text-xs text-slate-600">Your completed work and saved lesson, module or activity position are stored with your account.</p>
    </section>:<section className="card mt-8 border-blue-200 bg-blue-50" aria-labelledby="learning-preparation-title"><p className="eyebrow">Next step</p><h2 className="mt-2 text-2xl font-bold" id="learning-preparation-title">Your teacher is preparing your learning</h2><p className="mt-3 text-slate-700">Your account and course are active, but no starting point, allocated activity, active journey or published lesson is available yet.</p><Link className="link mt-4 inline-block" href="/curriculum">View my assigned units →</Link></section>}

    {journeyPosition&&<section className="card mt-8" aria-labelledby="my-computing-journey-title">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="eyebrow">My Computing Journey</p><h2 className="mt-2 text-3xl font-bold" id="my-computing-journey-title">{activeUnit?`Unit ${activeUnit.code}: ${capitaliseFirst(activeUnit.title)}`:capitaliseFirst(journeyPosition.journey_title)}</h2><p className="mt-2 text-lg font-semibold text-teal-800">Teaching Week {journeyPosition.teaching_week} of {journeyPosition.total_teaching_weeks}</p></div><span className={`rounded-full px-4 py-2 text-sm font-bold ${journeyPosition.position_status==="paused"?"bg-sky-100 text-sky-900":journeyPosition.position_status==="completed"?"bg-teal-100 text-teal-900":"bg-emerald-100 text-emerald-900"}`}>{journeyPosition.position_status==="paused"?"Paused for college break":journeyPosition.position_status==="completed"?"Journey complete":"In progress"}</span></div>
      {journeyPosition.position_status==="paused"&&<p className="mt-5 rounded-xl bg-sky-50 p-4 text-sm text-sky-950"><strong>{journeyPosition.pause_reason}</strong> does not count as a teaching week. Your journey resumes on {formatJourneyDate(journeyPosition.next_teaching_on)}.</p>}
      {currentJourneyWeek&&activeUnitCode&&<div className="mt-5 rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Current topic · {currentJourneyWeek.topicCode}</p><h3 className="mt-2 text-xl font-bold">{capitaliseFirst(currentJourneyWeek.title)}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{capitaliseFirst(currentJourneyWeek.focus)}</p></div><span className="rounded-full bg-blue-100 px-3 py-2 text-sm font-bold text-blue-900">{journeyMilestoneLabel(currentJourneyWeek.milestone)}</span></div><div className="mt-4 flex flex-wrap gap-3"><Link className="button" href={`/curriculum/units/${activeUnitCode}/topics/${encodeURIComponent(currentJourneyWeek.topicCode)}?stage=${evidenceStageForMilestone(currentJourneyWeek.milestone)}#worksheet`}>{currentJourneyWeek.milestone==="learning"?"Open this week's lesson and worksheet":"Open milestone evidence"} →</Link><Link className="button-secondary" href="/portfolio">View preserved evidence</Link></div></div>}
      <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold">See journey details</summary>{activeUnitCode&&<ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Formal learning checkpoints">{milestoneStages.map(item=>{const evidence=journeyWorksheets?.find(row=>row.unit_code===activeUnitCode&&row.evidence_stage===item.stage);return <li className={`rounded-xl border p-4 ${evidence?"border-teal-300 bg-teal-50":"border-slate-200 bg-white"}`} key={item.stage}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Teaching Week {item.week}</p><p className="mt-2 font-bold">{item.label}</p><p className="mt-2 text-sm text-slate-600">{evidence?`Evidence preserved · ${new Date(evidence.submitted_at).toLocaleDateString("en-GB")}`:"Not yet recorded"}</p></li>})}</ol>}<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><JourneyFact label="Unit starting point" value={unitStartingPoint?.percentage==null?"Not yet recorded":`${Math.round(Number(unitStartingPoint.percentage))}% · ${new Date(unitStartingPoint.completed_at).toLocaleDateString("en-GB")}`}/><JourneyFact label="Current topic position" value={currentCurriculumProgress?.practice_score==null?"Not yet recorded":`${currentCurriculumProgress.practice_score}% practice · ${currentCurriculumProgress.independent_attempts} independent attempt${Number(currentCurriculumProgress.independent_attempts)===1?"":"s"}`}/><JourneyFact label="Verified skill comparison" value={comparisons?.[0]?.improvement_points==null?"Not yet comparable":`${Number(comparisons[0].improvement_points)>=0?"+":""}${comparisons[0].improvement_points} percentage points`}/><JourneyFact label="Achievement Points" value={`${achievement.ap_total} AP`}/><JourneyFact label="Achievement level" value={achievement.current_level_title??"Building toward Bronze"}/><JourneyFact label="Next achievement milestone" value={achievement.next_level_title?`${achievement.points_to_next} AP to ${achievement.next_level_title}`:"Highest configured level reached"}/><JourneyFact label="Upcoming progress check" value={upcomingProgressCheck?`${journeyMilestoneLabel(upcomingProgressCheck.milestone)} · Teaching Week ${upcomingProgressCheck.week}`:"No further checkpoint in this journey"}/><JourneyFact label="Missed learning" value={catchUps.filter(item=>item.status!=="completed").length?`${catchUps.filter(item=>item.status!=="completed").length} catch-up item${catchUps.filter(item=>item.status!=="completed").length===1?"":"s"}`:"No catch-up recorded"}/></div>{achievement.certificate_status&&<p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950"><strong>Certificate eligible:</strong> awaiting authorised staff review.</p>}</details>
    </section>}

    {catchUps.some(item=>item.status!=="completed")&&<section className="card mt-6 border-amber-200" aria-labelledby="catch-up-title"><p className="eyebrow">Missed learning</p><h2 className="mt-2 text-2xl font-bold" id="catch-up-title">Catch-up</h2><div className="mt-5 grid gap-3">{catchUps.filter(item=>item.status!=="completed").map(item=>{const topic=topicByCode(item.unit_code,item.topic_code);return <Link className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:bg-amber-50" href={`/curriculum/units/${item.unit_code}/topics/${encodeURIComponent(item.topic_code)}?catchup=1#worksheet`} key={item.catch_up_id}><div><p className="font-semibold">Unit {item.unit_code} · {capitaliseFirst(topic?.title??item.topic_code)}</p><p className="mt-1 text-sm text-slate-600">Opened in Teaching Week {item.opened_teaching_week} · now Week {item.current_teaching_week}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-950">{item.status.replaceAll("_"," ")}</span></Link>})}</div></section>}

    {Boolean(recentFeedback?.length)&&<section className="card mt-6" aria-labelledby="recent-feedback-title"><p className="eyebrow">Feedback</p><h2 className="mt-2 text-2xl font-bold" id="recent-feedback-title">What to improve next</h2><div className="mt-5 grid gap-3">{recentFeedback?.map(review=>{const answer=related(review.attempt_answers);const attempt=related(answer?.attempts);return <article className="rounded-xl border border-slate-200 p-4" key={review.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{capitaliseFirst(related(attempt?.activities)?.title??"Reviewed learning")}</h3><p className="mt-1 text-xs text-slate-500">Checked {review.reviewed_at?new Date(review.reviewed_at).toLocaleDateString("en-GB"):"date not recorded"}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold capitalize text-blue-900">{review.status.replaceAll("_"," ")}</span></div><p className="mt-3 text-sm leading-6 text-slate-700">{review.feedback??answer?.feedback??"No feedback text was recorded."}</p></article>})}</div></section>}

    <details className="card mt-6"><summary className="cursor-pointer text-lg font-bold">My progress and achievements</summary><p className="mt-2 text-sm text-slate-600">Optional detail. Your next learning action always remains at the top of this page.</p><div className="mt-5">

    <section className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Current pathway" value={progress?.[0]?.current_pathway ?? mastery?.[0]?.current_pathway ?? "Starting point"} description="The current difficulty level selected from your learning evidence."/>
      <Metric label="Latest topic score" value={progress?.[0] ? `${progress[0].latest_score}%` : "Not started"} description="Your latest completed formative activity score; this is not your skill mastery."/>
      <Metric label="Achievement Points" value={`${achievement.ap_total} AP`} description={achievement.current_level_title?`${achievement.current_level_title}${achievement.next_level_title?` · ${achievement.points_to_next} AP to ${achievement.next_level_title}`:" · highest configured level"}`:"Building toward Bronze"}/>
      <Metric label="Practice streak" value={streak ? `${streak.current_count} learning days` : "Not started"}/>
    </section>

    {course&&<section className="card mt-6"><p className="eyebrow">Assigned curriculum</p><h2 className="mt-2 text-2xl font-bold">Your Units / Content Areas</h2><div className="mt-4 flex flex-wrap gap-2">{((course.class_units??[]) as {active:boolean;units:{id:string;code:string;title:string;kind:string}|{id:string;code:string;title:string;kind:string}[]|null}[]).filter(item=>item.active).map((item,index)=>{const unit=related(item.units);return unit&&isConfiguredUnitCode(unit.code)?<Link className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-teal-100" href={`/curriculum/units/${unit.code}`} key={index}>{`Unit ${unit.code}: `}{capitaliseFirst(unit.title)} →</Link>:<span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold" key={index}>{unit?.code.match(/^\d+$/)?`Unit ${unit.code}: `:""}{capitaliseFirst(unit?.title??"")}</span>})}</div><p className="mt-3 text-sm text-slate-500">Open any active unit to continue its current module and practice.</p></section>}

    <section className="card mt-6">
        <h2 className="text-xl font-bold">Your next target</h2>
        <p className="mt-4 leading-7 text-slate-600">{nextTarget?.target_text ?? "Complete an activity in your active unit to generate an evidence-based, skill-specific target."}</p>
        {nextTarget&&<div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><p><strong>Skill:</strong> {capitaliseFirst(related(nextTarget.skills)?.title??"Active-unit priority")}</p><p className="mt-1"><strong>Reason:</strong> {nextTarget.reason}</p><p className="mt-1"><strong>Evidence:</strong> {targetEvidence(nextTarget.evidence)}</p><p className="mt-1"><strong>Success:</strong> {nextTarget.success_measure??"Meet the percentage stated in the target."}</p><p className="mt-1"><strong>Deadline:</strong> {new Date(nextTarget.target_date).toLocaleDateString("en-GB")}</p></div>}
        {weakest && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><strong>Revisit:</strong> {capitaliseFirst(related(weakest.skills)?.title??"")} · {Math.round(Number(weakest.mastery_score))}% mastery</p>}
        {linkedTargetActivityId&&linkedTargetLessonId&&<Link className="link mt-4 inline-block text-sm" href={`/learn/${linkedTargetLessonId}/activities/${linkedTargetActivityId}`}>Open linked practice →</Link>}
    </section>

    {allocations?.length ? <section className="card mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Allocated learning</p><h2 className="mt-2 text-2xl font-bold">Due homework and classwork</h2></div><span className="text-sm text-slate-500">{allocations.filter(item => !completedAllocationIds.has(item.id)).length} outstanding</span></div>
      <div className="mt-5 grid gap-3">{allocations.map(item => {
        const activity = related(item.activities);
        const completed = completedAllocationIds.has(item.id);
        const overdue = !completed && item.deadline_at && new Date(item.deadline_at) < new Date();
        return <Link key={item.id} href={`/learn/${activity?.lesson_id}/activities/${activity?.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:bg-teal-50"><div><p className="font-semibold">{capitaliseFirst(activity?.title??"Learning activity")}</p><p className="mt-1 text-sm text-slate-500">{item.allocated_pathway} · {item.required ? "required" : "optional"} · due {item.deadline_at ? new Date(item.deadline_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "when ready"}</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${completed ? "bg-teal-100 text-teal-900" : overdue ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-950"}`}>{completed ? "Completed" : overdue ? "Overdue" : "Upcoming"}</span></Link>;
      })}</div>
    </section> : null}

    {calendarEvents?.length?<section className="card mt-6"><p className="eyebrow">Course calendar</p><h2 className="mt-2 text-2xl font-bold">Important dates</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{calendarEvents.map(event=><div className="rounded-xl border border-slate-200 p-4" key={event.id}><p className="text-xs font-bold uppercase tracking-wide text-teal-700">{event.kind.replaceAll("_"," ")}</p><p className="mt-1 font-semibold">{capitaliseFirst(event.title)}</p><p className="mt-1 text-sm text-slate-600">{new Date(event.starts_on).toLocaleDateString("en-GB")}{event.ends_on!==event.starts_on?` to ${new Date(event.ends_on).toLocaleDateString("en-GB")}`:""}</p><p className="mt-2 text-sm text-slate-500">{calendarNote(event.metadata)}</p></div>)}</div></section>:null}

    <section className="card mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">This week</p><h2 className="mt-2 text-2xl font-bold">Your practice path</h2></div><span className="text-sm text-slate-500">{pilotSummary.completed} of {pilotSummary.assigned} currently countable activities completed · {pilotSummary.percentage}% · {pilotSummary.required} required · {pilotSummary.optional} optional</span></div>
      <div className="mt-5 grid gap-3">{pilotActivities.map(activity => {
        const state=pilotStateByActivity.get(activity.id);
        const open=!state||["Available","Completed","Mastery Demonstrated","Additional Practice Required"].includes(state.state);
        const content=<><div><p className="font-semibold">{capitaliseFirst(activity.title)}</p><p className="text-sm text-slate-500">{activityStage(activity)} · {activity.estimated_minutes} minutes {activity.required ? "· required" : "· optional"}</p>{activity.learning_stage==="mastery_check"&&!activity.assessment_kind&&<p className="mt-1 text-xs font-semibold text-amber-900">Independent check with no hints. This confirms whether you are ready to move ahead.</p>}</div><span className={`rounded-full px-3 py-1 text-sm font-bold ${open?"bg-teal-100 text-teal-900":"bg-slate-100 text-slate-600"}`}>{state?state.percentage==null?state.status_detail:`${state.state} · ${Math.round(Number(state.percentage))}%`:"Available"}</span></>;
        return open?<Link key={activity.id} href={`/learn/${pilotLessonId}/activities/${activity.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:bg-teal-50">{content}</Link>:<div key={activity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">{content}</div>;
      })}</div>
    </section>

    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">Skill mastery</h2><span className="text-sm text-slate-500">{mastery?.length ?? 0} skills recorded</span></div>
        <div className="mt-5 grid gap-3">{academicMastery.length ? academicMastery.slice(0,6).map((skill, index) => <div key={index}><div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{capitaliseFirst(related(skill.skills)?.title??"")}</span><span>{Math.round(Number(skill.mastery_score))}% · {skill.current_pathway}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${Number(skill.mastery_score)}%` }}/></div></div>) : <p className="text-slate-600">Complete a practice activity to begin tracking each skill.</p>}</div>
      </div>
      <div className="card"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">Achievements</h2><Link className="link text-sm" href="/rewards">Cosmetic rewards · {coinBalance} coins</Link></div>
        <div className="mt-5 grid gap-3">{badges?.length ? badges.slice(0,4).map(award => {const badge=related(award.badge_definitions);return <div data-achievement-badge key={award.id} className="flex gap-3 rounded-xl bg-amber-50 p-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-2xl" aria-label={`${badge?.title??"Achievement"} icon`}>{badgeIcon(badge?.icon)}</span><div><p className="font-semibold">{badge?.title}</p><p className="mt-1 text-sm text-amber-900">Awarded {new Date(award.awarded_at).toLocaleDateString("en-GB")}</p><p className="mt-1 text-xs text-amber-800">{award.reason} · {badge?.one_time?"one-time":"repeatable"}</p><p className="mt-1 text-xs text-amber-800"><strong>Evidence:</strong> {badgeEvidence(award.evidence)}</p></div></div>}) : <p className="text-slate-600">Your first learning badge will appear here.</p>}</div>
      </div>
    </section>

    {recognitions.length>0&&<section className="card mt-6 border-blue-200 bg-blue-50"><p className="eyebrow">You&apos;ve been noticed</p><h2 className="mt-2 text-2xl font-bold">Professional recognition</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{recognitions.map(item=><article className="rounded-xl bg-white p-4" key={item.id}><h3 className="font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{item.message}</p><p className="mt-2 text-xs text-slate-500">{new Date(item.recognised_at).toLocaleDateString("en-GB")}</p></article>)}</div></section>}

    {retrieval?.[0] && <section className="card mt-6 border-teal-200 bg-teal-50"><p className="eyebrow">Upcoming retrieval review</p><h2 className="mt-2 text-xl font-bold">{capitaliseFirst(related(retrieval[0].topics)?.title??"Learning topic")}</h2><p className="mt-2 text-slate-700">Scheduled for {new Date(retrieval[0].scheduled_for).toLocaleDateString("en-GB")} · {retrieval[0].status}</p>{retrieval[0].review_activity_id && <Link className="button mt-4" href={`/learn/${pilotLessonId}/activities/${retrieval[0].review_activity_id}`}>Open retrieval review</Link>}</section>}

    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card"><p className="eyebrow">Starting and progress points</p><h2 className="mt-2 text-2xl font-bold">Progress from your original baseline</h2>
        <div className="mt-5 grid gap-3">{comparisons?.length ? comparisons.map((comparison,index) => {const startingCount=evidenceNumber(comparison.evidence,"starting_question_count");const progressCount=evidenceNumber(comparison.evidence,"progress_question_count");const startingSufficient=evidenceBoolean(comparison.evidence,"starting_sufficient");const progressSufficient=evidenceBoolean(comparison.evidence,"progress_sufficient");return <div className="rounded-xl border border-slate-200 p-4" key={index}><div className="flex flex-wrap justify-between gap-2"><strong>{capitaliseFirst(related(comparison.skills)?.title??"Learning skill")}</strong><span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">{comparison.status}</span></div><p className="mt-2 text-sm text-slate-600">Starting point: {startingSufficient?`${comparison.starting_percentage}%, based on ${startingCount} questions`:startingCount>0?`Insufficient evidence: ${startingCount} mapped question${startingCount===1?"":"s"}`:"Not yet assessed"}</p><p className="mt-1 text-sm text-slate-600">Progress point: {comparison.latest_percentage==null?"Not yet assessed":progressSufficient?`${comparison.latest_percentage}%, based on ${progressCount} equivalent questions`:`Insufficient evidence: ${progressCount} mapped question${progressCount===1?"":"s"}`}</p>{comparison.improvement_points!=null&&startingSufficient&&progressSufficient&&<p className="mt-1 text-sm font-semibold">{Number(comparison.improvement_points)>=0?"+":""}{comparison.improvement_points} percentage points</p>}</div>}) : <p className="text-slate-600">Complete the course and unit starting points to create your permanent baseline.</p>}</div>
        <p className="mt-4 text-sm text-slate-500">{assessments?.length ?? 0} starting, progress or retention records stored.</p>
      </div>
      <div className="card"><p className="eyebrow">Adaptive route</p><h2 className="mt-2 text-2xl font-bold">{routes?.[0]?.route ?? "Full Path"}</h2><p className="mt-2 text-sm font-semibold text-teal-800">The amount of teaching and practice required for this topic.</p><p className="mt-3 text-slate-600">{routeMessage(routes?.[0]?.route)}</p>{routes?.[0]?.retention_due_on && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Retention check scheduled for {new Date(routes[0].retention_due_on).toLocaleDateString("en-GB")}.</p>}<p className="mt-4 text-sm text-slate-500">Routes: Full Path, Reduced Practice, Mastery Check Only, Fast-Tracked, or Teacher Override. This is separate from Support/Core/Stretch/Mastery difficulty.</p></div>
    </section>
    </div></details>
  </main>;
}

async function TeacherHomeDashboard() {
  const supabase = await createClient();
  const [{ data: classes }, { data: journeyTemplates }] = await Promise.all([
    supabase.from("classes").select("id,name,active_unit_id,weekly_learning_day,weekly_learning_days,published,enrolments(count),class_enrolments:enrolments(student_id),student_invitations(status),class_units(unit_id,active,archived_at,units(code,title,status,archived_at))").is("archived_at", null).order("name"),
    supabase.from("learning_journey_templates").select("unit_id").eq("status", "approved").is("archived_at", null),
  ]);
  const classSignals = await Promise.all((classes ?? []).map(async item => {
    const { data } = await supabase.rpc("class_learner_attention", { class_uuid: item.id });
    return ((data ?? []) as TeacherAttentionDb[]).map(row => ({
      ...row,
      classId: item.id,
      className: item.name,
    }));
  }));
  const attention = classSignals.flat();
  const approvedJourneyUnitIds = new Set((journeyTemplates ?? []).map(template => template.unit_id));
  const readinessByClass = new Map((classes ?? []).map(item => {
    const activeClassUnits = (item.class_units ?? []).filter(unit => unit.active && !unit.archived_at);
    const currentAssignment = activeClassUnits.find(unit => unit.unit_id === item.active_unit_id);
    const currentUnit = related(currentAssignment?.units);
    const configuredUnitCode = currentUnit
      && currentUnit.status === "approved"
      && !currentUnit.archived_at
      && unitByCode(currentUnit.code)
      ? currentUnit.code
      : null;
    return [item.id, classInvitationReadiness({
      published: item.published,
      activeUnitId: item.active_unit_id,
      activeClassUnitIds: activeClassUnits.map(unit => unit.unit_id),
      configuredUnitCode,
      hasApprovedJourney: Boolean(item.active_unit_id && approvedJourneyUnitIds.has(item.active_unit_id)),
    })] as const;
  }));
  const teacherNextAction = selectTeacherNextAction({
    classes: (classes ?? []).map(item => ({
      id: item.id,
      name: item.name,
      published: item.published,
      activeUnitCount: (item.class_units ?? []).filter(unit => unit.active).length,
      studentCount: item.enrolments?.[0]?.count ?? 0,
      pendingInvitationCount: (item.student_invitations ?? []).filter(invitation => ["pending", "sent"].includes(invitation.status)).length,
    })),
    attention: attention.map(item => ({
      learnerId: item.learner_id,
      displayName: item.display_name,
      status: item.attention_status,
      reason: item.attention_reason,
    })),
    canManageGroupSetup: false,
  });
  const studentIds = new Set((classes ?? []).flatMap(item => (item.class_enrolments ?? []).map(row => row.student_id)));
  const actionableStatuses = new Set(["intervention_required", "action_required", "catch_up_required"]);
  const needAttention = attention.filter(item => actionableStatuses.has(item.attention_status)).length;
  const readyForStudents = (classes ?? []).filter(item =>
    readinessByClass.get(item.id)?.ready === true && (item.enrolments?.[0]?.count ?? 0) === 0
  ).length;

  return <main className="shell py-10">
    <RoleBanner role="teacher"/>
    <div className="mt-8"><p className="eyebrow">Teacher home</p><h1 className="mt-2 text-4xl font-bold">Your groups</h1><p className="mt-2 max-w-3xl text-slate-600">Choose a group, check who needs help and download reports from the group page.</p></div>
    <section className={`card mt-8 ${teacherNextAction.kind === "attention" ? "border-amber-200 bg-amber-50" : "border-teal-200 bg-teal-50"}`} aria-labelledby="teacher-next-action-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl"><p className="eyebrow">{teacherNextAction.eyebrow}</p><h2 className="mt-2 text-3xl font-bold" id="teacher-next-action-title">{teacherNextAction.title}</h2><p className="mt-3 leading-7 text-slate-700">{teacherNextAction.detail}</p></div>
        {teacherNextAction.meta && <span className="rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-900">{teacherNextAction.meta}</span>}
      </div>
      <Link className="button mt-6 min-w-40 text-center" href={teacherNextAction.href}>{teacherNextAction.label} →</Link>
      <p className="mt-3 text-xs text-slate-600">The portal handles learning routes automatically. Act only when a student needs help.</p>
    </section>
    <section className="card mt-6" id="groups" aria-labelledby="groups-title">
      <p className="eyebrow">My groups</p><h2 className="mt-2 text-2xl font-bold" id="groups-title">Choose a group</h2><p className="mt-2 text-sm text-slate-600">Each group contains its students, current progress and downloadable reports.</p>
      <div className="mt-6 grid gap-3">{classes?.length ? classes.map(item => <TeacherGroupCard
        id={item.id}
        invitationReady={readinessByClass.get(item.id)?.ready === true}
        key={item.id}
        name={item.name}
        schedule={formatWeeklyLearningDays(item.weekly_learning_days, item.weekly_learning_day)}
        studentCount={item.enrolments?.[0]?.count ?? 0}
        unitTitles={(item.class_units ?? []).filter(unit => unit.active && !unit.archived_at)
          .map(unit => related(unit.units)?.title).filter((title): title is string => Boolean(title))}
      />) : <p className="rounded-2xl bg-slate-50 p-6 text-slate-600">No group has been assigned to you yet. There is nothing for you to configure.</p>}</div>
    </section>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Teacher overview">
      <Metric label="Groups" value={String(classes?.length ?? 0)}/>
      <Metric label="Students" value={String(studentIds.size)}/>
      <Metric label="Need attention" value={String(needAttention)}/>
      <Metric label="Ready for students" value={String(readyForStudents)}/>
    </section>
    {studentIds.size > 0 && <TeacherPriorityList items={attention.map(item => ({
      classId: item.classId,
      className: item.className,
      learnerId: item.learner_id,
      learnerName: item.display_name,
      status: item.attention_status,
      reason: item.attention_reason,
    }))}/>}
  </main>;
}

async function AdministratorDashboard({role,filters }: {role:"administrator";filters:TeacherFilters }) {
  const supabase = await createClient();
  const now=await currentTimestamp();
  const classesQuery=supabase.from("classes").select("id,name,course_id,academic_year_id,academic_period_id,active_unit_id,weekly_learning_day,weekly_learning_days,published,enrolments(count),class_enrolments:enrolments(student_id),student_invitations(status),courses(title),class_units(unit_id,active,archived_at,units(code,title,status,archived_at))").is("archived_at", null);
  const [
    { data: classes }, { data: courses }, { data: years }, { data: mastery },
    { data: misconceptions }, { data: badges }, { data: coins },
    {data:periods},{data:units},{data:topics},{data:skills},{data:attemptEvidence},
    {data:allocationEvidence},
    {data:assessmentEvidence},{data:progressComparisons},{data:targetEvidence},
    {data:teacherActionEvidence},{data:routeEvidence},{data:journeyTemplates},
  ] = await Promise.all([
    classesQuery,
    supabase.from("courses").select("id,title,qualification_type,qualification_level,awarding_organisation,units(id,code,title,kind,initial_teaching,status)").eq("active", true).is("archived_at", null).order("title"),
    supabase.from("academic_years").select("id,name").is("archived_at", null).order("starts_on", { ascending: false }),
    supabase.from("skill_mastery").select("learner_id,skill_id,mastery_score,current_pathway,skills(topic_id)"),
    supabase.from("learner_misconceptions").select("learner_id,skill_id,occurrence_count,misconceptions(title,skills(title))").order("occurrence_count", { ascending: false }),
    supabase.from("badge_awards").select("id,learner_id"),
    supabase.from("coin_transactions").select("learner_id,amount"),
    supabase.from("academic_periods").select("id,name,academic_year_id").is("archived_at",null).order("starts_on"),
    supabase.from("units").select("id,course_id,code,title").is("archived_at",null).order("sort_order"),
    supabase.from("topics").select("id,unit_id,title").is("archived_at",null).order("sort_order"),
    supabase.from("skills").select("id,topic_id,title").is("archived_at",null).order("sort_order"),
    supabase.from("attempts").select("learner_id,activity_id,allocation_id,started_at,completed_at,activities(kind,lessons(topics(id,unit_id)))").order("started_at",{ascending:false}).limit(1000),
    supabase.from("activity_allocations").select("id,class_id,learner_id,activity_id,release_at,deadline_at,required,class_scope_source,activities(kind,lessons(topics(id,unit_id)))").not("class_id","is",null).is("archived_at",null).limit(1000),
    supabase.from("assessment_instances").select("learner_id,kind,completed_at,activities(lessons(topics(id,unit_id)))").not("completed_at","is",null),
    supabase.from("skill_progress_comparisons").select("learner_id,skill_id,improvement_points,status"),
    supabase.from("targets").select("learner_id,status,target_date,review_on").is("archived_at",null),
    supabase.from("teacher_actions").select("learner_id,review_on,outcome").is("archived_at",null),
    supabase.from("learner_routes").select("learner_id,topic_id,route,status").eq("status","active"),
    supabase.from("learning_journey_templates").select("unit_id").eq("status","approved").is("archived_at",null),
  ]);
  const classSignals=await Promise.all((classes??[]).map(async item=>{
    const[{data:attentionData},{data:achievementData},{data:journeyData}]=await Promise.all([
      supabase.rpc("class_learner_attention",{class_uuid:item.id}),
      supabase.rpc("class_learner_achievement",{class_uuid:item.id}),
      supabase.rpc("current_class_learning_journey",{class_uuid:item.id}),
    ]);
    const achievementByLearner=new Map(((achievementData??[]) as TeacherAchievementDb[]).map(row=>[row.learner_id,row]));
    const attention=((attentionData??[]) as TeacherAttentionDb[]).map(row=>({...row,classId:item.id,className:item.name,
      ap_total:achievementByLearner.get(row.learner_id)?.ap_total??0,
      achievement_level:achievementByLearner.get(row.learner_id)?.achievement_level??null,
      next_level:achievementByLearner.get(row.learner_id)?.next_level??"Bronze",
      points_to_next:achievementByLearner.get(row.learner_id)?.points_to_next??25,
      certificate_status:achievementByLearner.get(row.learner_id)?.certificate_status??null,
    }));
    const activeUnit=related(item.class_units?.find(unit=>unit.active)?.units);
    const journey=(journeyData?.[0]&&activeUnit?.code) ? {
      classId:item.id,className:item.name,unitCode:String(activeUnit.code),
      teachingWeek:Number(journeyData[0].teaching_week),positionStatus:String(journeyData[0].position_status),
      nextTeachingOn:journeyData[0].next_teaching_on as string|null,
    } satisfies TeacherJourneySignal : null;
    return {attention,journey};
  }));
  const allAttention=classSignals.flatMap(item=>item.attention);
  const allClassLearnerIds=(classes??[]).flatMap(item=>(item.class_enrolments??[]).map(row=>row.student_id));
  const overview=summariseTeacherOverview({
    enrolmentLearnerIds:allClassLearnerIds,
    completedAssessmentLearnerIds:(assessmentEvidence??[]).map(row=>row.learner_id),
    attentionStatuses:allAttention.map(item=>item.attention_status),
  });
  const totalStudentCount=overview.students;
  const groupJourneySignals=classSignals.flatMap(item=>item.journey?[item.journey]:[]);
  const latestAttemptByLearnerActivity=new Map<string,{started_at:string;completed_at:string|null}>();
  const completedAttemptByAllocation=new Map<string,{started_at:string;completed_at:string|null}>();
  for(const attempt of attemptEvidence??[]){
    const key=`${attempt.learner_id}:${attempt.activity_id}`;
    if(!latestAttemptByLearnerActivity.has(key)) latestAttemptByLearnerActivity.set(key,attempt);
    if(attempt.allocation_id&&attempt.completed_at&&!completedAttemptByAllocation.has(attempt.allocation_id)){
      completedAttemptByAllocation.set(attempt.allocation_id,attempt);
    }
  }
  const classById=new Map((classes??[]).map(item=>[item.id,item]));
  const completedByClassLearner=new Map<string,Set<string>>();
  for(const classRow of classes??[]){
    for(const enrolment of classRow.class_enrolments??[]){
      const learnerId=enrolment.student_id;
      const applicable=(allocationEvidence??[]).filter(allocation=>
        allocation.class_id===classRow.id&&
        (allocation.learner_id==null||allocation.learner_id===learnerId));
      completedByClassLearner.set(`${classRow.id}:${learnerId}`,matchCompletedAllocationIds(
        applicable.map(allocation=>({
          id:allocation.id,learnerId:allocation.learner_id,
          activityId:allocation.activity_id,releaseAt:allocation.release_at,
          deadlineAt:allocation.deadline_at,required:allocation.required,
          classScopeSource:allocation.class_scope_source,
        })),
        (attemptEvidence??[]).filter(attempt=>
          attempt.learner_id===learnerId&&attempt.completed_at!=null).map(attempt=>({
          learnerId,activityId:attempt.activity_id,
          allocationId:attempt.allocation_id,completedAt:String(attempt.completed_at),
        })),
      ));
    }
  }
  const completionEvidence=(allocationEvidence??[]).flatMap(allocation=>{
    const learners=allocation.learner_id
      ? [allocation.learner_id]
      : (classById.get(allocation.class_id ?? "")?.class_enrolments??[]).map(row=>row.student_id);
    return learners.map(learnerId=>{
      const attempt=latestAttemptByLearnerActivity.get(`${learnerId}:${allocation.activity_id}`);
      const completed=completedByClassLearner
        .get(`${allocation.class_id}:${learnerId}`)?.has(allocation.id)??false;
      const completionAttempt=completedAttemptByAllocation.get(allocation.id)??attempt;
      const deadline=allocation.deadline_at?new Date(allocation.deadline_at).getTime():null;
      const completedAt=completed&&completionAttempt?.completed_at
        ?new Date(completionAttempt.completed_at).getTime():null;
      const status=completed
        ? deadline&&completedAt!=null&&completedAt>deadline?"late":"completed"
        : attempt?"started"
        : deadline&&deadline<now?"overdue":"not_attempted";
      return{classId:allocation.class_id,learnerId,activityId:allocation.activity_id,status,
        kind:related(allocation.activities)?.kind,topicId:activityTopicId(allocation.activities),
        evidenceAt:completionAttempt?.completed_at??allocation.release_at};
    });
  });
  const baseVisibleClasses=(classes??[]).filter(item=>
    (!filters.academicYear||item.academic_year_id===filters.academicYear)&&
    (!filters.period||item.academic_period_id===filters.period)&&
    (!filters.course||item.course_id===filters.course)&&
    (!filters.class||item.id===filters.class)&&
    (!filters.unit||(item.class_units??[]).some(unit=>unit.active&&unit.unit_id===filters.unit))
  );
  const baseVisibleClassIds=new Set(baseVisibleClasses.map(item=>item.id));
  const baseLearners=new Set(baseVisibleClasses.flatMap(item=>(item.class_enrolments??[]).map(row=>row.student_id)));
  const topicUnitById=new Map((topics??[]).map(topic=>[topic.id,topic.unit_id]));
  const skillTopicById=new Map((skills??[]).map(skill=>[skill.id,skill.topic_id]));
  const skillIdsByUnit=new Map<string,string[]>();
  for(const skill of skills??[]){
    const unitId=topicUnitById.get(skill.topic_id);
    if(unitId)skillIdsByUnit.set(unitId,[...(skillIdsByUnit.get(unitId)??[]),skill.id]);
  }
  const unitSkillIds=new Set(filters.unit?skillIdsByUnit.get(filters.unit)??[]:[]);
  const filteredMastery=(mastery??[]).filter(item=>
    baseLearners.has(item.learner_id)&&
    (!filters.unit||unitSkillIds.has(item.skill_id))&&
    (!filters.pathway||item.current_pathway===filters.pathway)&&
    (!filters.skill||item.skill_id===filters.skill)&&
    (!filters.topic||related(item.skills)?.topic_id===filters.topic)
  );
  const filteredAttempts=(attemptEvidence??[]).filter(item=>
    baseLearners.has(item.learner_id)&&
    item.completed_at&&
    (!filters.unit||activityUnitId(item.activities)===filters.unit)&&
    (!filters.activityType||related(item.activities)?.kind===filters.activityType)&&
    (!filters.dateFrom||new Date(item.completed_at)>=new Date(`${filters.dateFrom}T00:00:00`))&&
    (!filters.dateTo||new Date(item.completed_at)<=new Date(`${filters.dateTo}T23:59:59`))
  );
  const filteredCompletionEvidence=completionEvidence.filter(row=>
    baseVisibleClassIds.has(row.classId??"")&&
    (!filters.unit||topicUnitById.get(row.topicId??"")===filters.unit)&&
    (!filters.topic||row.topicId===filters.topic)&&
    (!filters.completionStatus||filters.completionStatus==="assigned"||row.status===filters.completionStatus)&&
    (!filters.activityType||row.kind===filters.activityType)&&
    (!filters.dateFrom||Boolean(row.evidenceAt&&new Date(row.evidenceAt)>=new Date(`${filters.dateFrom}T00:00:00`)))&&
    (!filters.dateTo||Boolean(row.evidenceAt&&new Date(row.evidenceAt)<=new Date(`${filters.dateTo}T23:59:59`)))
  );
  const matchingActivityLearners=new Set(filteredAttempts.map(item=>item.learner_id));
  filteredCompletionEvidence.forEach(item=>matchingActivityLearners.add(item.learnerId));
  const selectedLearners=selectTeacherDashboardLearners({
    baseLearnerIds:[...baseLearners],studentId:filters.student,
    masteryFilterActive:Boolean(filters.pathway),
    masteryLearnerIds:filteredMastery.map(item=>item.learner_id),
    attemptFilterActive:Boolean(filters.dateFrom||filters.dateTo),
    attemptLearnerIds:[...new Set([...filteredAttempts.map(item=>item.learner_id),...filteredCompletionEvidence.map(item=>item.learnerId)])],
    activityFilterActive:Boolean(filters.activityType),activityLearnerIds:[...matchingActivityLearners],
    completionFilterActive:Boolean(filters.completionStatus),
    completionLearnerIds:filteredCompletionEvidence.map(item=>item.learnerId),
  });
  const learnerEvidenceFilterActive=Boolean(filters.student||filters.unit||filters.topic||filters.skill||filters.pathway||filters.activityType||filters.dateFrom||filters.dateTo||filters.completionStatus);
  const visibleClasses=learnerEvidenceFilterActive
    ? baseVisibleClasses.filter(item=>(item.class_enrolments??[]).some(row=>selectedLearners.has(row.student_id)))
    : baseVisibleClasses;
  const approvedJourneyUnitIds=new Set((journeyTemplates??[]).map(template=>template.unit_id));
  const invitationReadinessByClass=new Map(visibleClasses.map(item=>{
    const activeClassUnits=(item.class_units??[]).filter(unit=>unit.active&&!unit.archived_at);
    const currentAssignment=activeClassUnits.find(unit=>unit.unit_id===item.active_unit_id);
    const currentUnit=related(currentAssignment?.units);
    const configuredUnitCode=currentUnit
      && currentUnit.status==="approved"
      && !currentUnit.archived_at
      && unitByCode(currentUnit.code)
      ? currentUnit.code
      : null;
    return [item.id,classInvitationReadiness({
      published:item.published,
      activeUnitId:item.active_unit_id,
      activeClassUnitIds:activeClassUnits.map(unit=>unit.unit_id),
      configuredUnitCode,
      hasApprovedJourney:Boolean(item.active_unit_id&&approvedJourneyUnitIds.has(item.active_unit_id)),
    })] as const;
  }));
  const visibleClassIds=new Set(visibleClasses.map(item=>item.id));
  const visibleJourneySignals=groupJourneySignals.filter(item=>visibleClassIds.has(item.classId));
  const evidenceLearners=selectedLearners;
  const assessmentCount=(kind:string)=>new Set((assessmentEvidence??[])
    .filter(row=>evidenceLearners.has(row.learner_id)&&row.kind===kind&&(!filters.unit||activityUnitId(row.activities)===filters.unit)&&(!filters.topic||activityTopicId(row.activities)===filters.topic))
    .map(row=>row.learner_id)).size;
  const completionCount=(kind:string)=>filteredCompletionEvidence
    .filter(row=>evidenceLearners.has(row.learnerId)&&row.kind===kind&&["completed","late"].includes(row.status)).length;
  const improvementRows=(progressComparisons??[]).filter(row=>evidenceLearners.has(row.learner_id)&&row.improvement_points!=null&&(!filters.unit||unitSkillIds.has(row.skill_id))&&(!filters.topic||skillTopicById.get(row.skill_id)===filters.topic)&&(!filters.skill||row.skill_id===filters.skill));
  const curriculumDetailFilterActive=Boolean(filters.topic||filters.skill);
  const scopedScoreByLearner=averageByLearner(filteredMastery,"mastery_score");
  const scopedProgressByLearner=averageByLearner(improvementRows,"improvement_points");
  const attention=allAttention.filter(item=>visibleClassIds.has(item.classId)&&selectedLearners.has(item.learner_id)).map(item=>{
    if(!curriculumDetailFilterActive)return item;
    const currentScore=scopedScoreByLearner.get(item.learner_id)??null;
    const scoped=scopedTeacherAttention({baseStatus:item.attention_status,baseReason:item.attention_reason,catchUpStatus:item.catch_up_status,outstandingCount:item.outstanding_count,currentScore});
    return {...item,current_score:currentScore,progress_points:scopedProgressByLearner.get(item.learner_id)??null,attention_status:scoped.status,attention_reason:scoped.reason};
  }).sort((left,right)=>attentionRank(left.attention_status)-attentionRank(right.attention_status)||left.display_name.localeCompare(right.display_name));
  const filteredMisconceptions=(misconceptions??[]).filter(row=>
    selectedLearners.has(row.learner_id)&&
    (!filters.unit||unitSkillIds.has(row.skill_id))&&
    (!filters.topic||skillTopicById.get(row.skill_id)===filters.topic)&&
    (!filters.skill||row.skill_id===filters.skill)
  );
  const routeCount=(route:string)=>new Set((routeEvidence??[])
    .filter(row=>evidenceLearners.has(row.learner_id)&&row.route===route&&(!filters.topic||row.topic_id===filters.topic)&&(!filters.unit||topicUnitById.get(row.topic_id)===filters.unit))
    .map(row=>row.learner_id)).size;
  const todayIso=new Date(now).toISOString().slice(0,10);
  const activeTargets=(targetEvidence??[]).filter(row=>evidenceLearners.has(row.learner_id));
  const inactiveLearners=[...evidenceLearners].filter(learnerId=>
    !(attemptEvidence??[]).some(attempt=>attempt.learner_id===learnerId&&attempt.completed_at)
  ).length;
  const actionsAwaitingReview=(teacherActionEvidence??[]).filter(row=>
    evidenceLearners.has(row.learner_id)&&row.review_on&&row.review_on<=todayIso&&!row.outcome
  ).length;
  const masteryByLearnerSkill=new Map((mastery??[]).map(row=>[`${row.learner_id}:${row.skill_id}`,Number(row.mastery_score)]));
  const assessmentReadyLearners=new Set<string>();
  for(const group of visibleClasses){
    const requiredSkillIds=(group.class_units??[]).filter(unit=>unit.active)
      .flatMap(unit=>skillIdsByUnit.get(unit.unit_id)??[]);
    if(!requiredSkillIds.length)continue;
    for(const enrolment of group.class_enrolments??[]){
      if(requiredSkillIds.every(skillId=>(masteryByLearnerSkill.get(`${enrolment.student_id}:${skillId}`)??-1)>=70))
        assessmentReadyLearners.add(enrolment.student_id);
    }
  }
  const upcomingCheckpoints=visibleJourneySignals.map(signal=>({
    ...signal,milestone:nextJourneyMilestone(signal.unitCode,signal.teachingWeek),
  })).filter(item=>item.milestone);
  const teacherNextAction=selectTeacherNextAction({
    classes:(classes??[]).map(item=>({
      id:item.id,
      name:item.name,
      published:item.published,
      activeUnitCount:(item.class_units??[]).filter(unit=>unit.active).length,
      studentCount:item.enrolments?.[0]?.count??0,
      pendingInvitationCount:(item.student_invitations??[]).filter(invitation=>["pending","sent"].includes(invitation.status)).length,
    })),
    attention:allAttention.map(item=>({
      learnerId:item.learner_id,
      displayName:item.display_name,
      status:item.attention_status,
      reason:item.attention_reason,
    })),
    canManageGroupSetup:role==="administrator",
  });

  return <main className="shell py-10">
    <RoleBanner role={role}/>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">{role==="administrator"?"Teaching administration":"Teacher home"}</p><h1 className="mt-2 text-4xl font-bold">{role==="administrator"?"Groups and progress":"Your groups"}</h1><p className="mt-2 max-w-3xl text-slate-600">Open a group, see its students and progress, then download a report when you need one.</p></div>{role==="administrator"&&<Link className="button-secondary" href="/admin">Administration</Link>}</div>
    <section className={`card mt-8 ${teacherNextAction.kind==="attention"?"border-amber-200 bg-amber-50":"border-teal-200 bg-teal-50"}`} aria-labelledby="teacher-next-action-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl"><p className="eyebrow">{teacherNextAction.eyebrow}</p><h2 className="mt-2 text-3xl font-bold" id="teacher-next-action-title">{teacherNextAction.title}</h2><p className="mt-3 leading-7 text-slate-700">{teacherNextAction.detail}</p></div>
        {teacherNextAction.meta&&<span className="rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-900">{teacherNextAction.meta}</span>}
      </div>
      <Link className="button mt-6 min-w-40 text-center" href={teacherNextAction.href}>{teacherNextAction.label} →</Link>
      <p className="mt-3 text-xs text-slate-600">The portal handles the learning route automatically; teachers only act when a student needs help.</p>
    </section>
    <section className="card mt-6" id="groups" aria-labelledby="groups-title">
      <div><p className="eyebrow">My groups</p><h2 className="mt-2 text-2xl font-bold" id="groups-title">Choose a group</h2><p className="mt-2 text-sm text-slate-600">Open a group to see its students, progress and report. Unit setup is shown only to administrators.</p></div>
      <div className="mt-6 grid gap-3">{visibleClasses.length ? visibleClasses.map(item => <TeacherGroupCard
        id={item.id}
        invitationReady={invitationReadinessByClass.get(item.id)?.ready===true}
        key={item.id}
        name={item.name}
        schedule={formatWeeklyLearningDays(item.weekly_learning_days,item.weekly_learning_day)}
        studentCount={item.enrolments?.[0]?.count ?? 0}
        unitTitles={(item.class_units??[]).filter(unit=>unit.active&&!unit.archived_at)
          .map(unit=>related(unit.units)?.title).filter((title):title is string=>Boolean(title))}
      />) : <p className="rounded-2xl bg-slate-50 p-6 text-slate-600">{role==="administrator"?"No groups have been created yet.":"No group has been assigned to you yet. There is nothing for you to configure."}</p>}</div>
      {role==="administrator"&&<details className="mt-5 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-bold">Add a group</summary><p className="mt-2 text-sm text-slate-600">Administrator setup only. Teachers receive ready-to-use groups.</p><CreateClassForm courses={courses ?? []} years={years ?? []}/></details>}
    </section>
    <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Live teaching totals"><Metric label="Students" value={String(overview.students)}/><Metric label="Active enrolments" value={String(overview.activeEnrolments)}/><Metric label="Completed assessments" value={String(overview.completedAssessments)}/><Metric label="Need attention" value={String(overview.needAttention)}/></section>

    <details className="card mt-6"><summary className="cursor-pointer text-lg font-bold">More teaching insights</summary><p className="mt-2 text-sm text-slate-600">Optional detail for filtering, milestones and whole-department analysis. You do not need this section for normal teaching.</p>

    {totalStudentCount>0&&<section className="card mt-6 overflow-x-auto"><div><p className="eyebrow">Priority list</p><h2 className="mt-2 text-2xl font-bold">Who needs me?</h2><p className="mt-2 text-sm text-slate-600">Based on recorded catch-up, intervention, outstanding work and current learning evidence.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><PriorityCount label="Intervention Required" value={attention.filter(item=>item.attention_status==="intervention_required").length} status="intervention_required"/><PriorityCount label="Action Required" value={attention.filter(item=>item.attention_status==="action_required").length} status="action_required"/><PriorityCount label="Catch-up Required" value={attention.filter(item=>item.attention_status==="catch_up_required").length} status="catch_up_required"/><PriorityCount label="On Track" value={attention.filter(item=>item.attention_status==="on_track").length} status="on_track"/><PriorityCount label="Exceeding" value={attention.filter(item=>item.attention_status==="exceeding").length} status="exceeding"/></div><table className="mt-6 w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-600"><th className="pb-3">Student</th><th className="pb-3">Group</th><th className="pb-3">Current</th><th className="pb-3">Progress</th><th className="pb-3">Achievement</th><th className="pb-3">Catch-up / outstanding</th><th className="pb-3">Status and reason</th></tr></thead><tbody>{attention.slice(0,20).map(item=><tr className="border-b border-slate-100" key={`${item.classId}:${item.learner_id}`}><td className="py-4 font-semibold"><Link className="link" href={`/teacher/learners/${item.learner_id}?classId=${item.classId}`}>{item.display_name}</Link></td><td>{item.className}</td><td>{item.current_score==null?"Not recorded":`${item.current_score}%`}</td><td>{item.progress_points==null?"Not comparable":`${Number(item.progress_points)>=0?"+":""}${item.progress_points} pp`}</td><td><strong>{item.ap_total} AP · {item.achievement_level??"Building"}</strong><p className="mt-1 text-xs text-slate-500">{item.next_level?`${item.points_to_next} AP to ${item.next_level}`:"Highest configured level"}{item.certificate_status?" · certificate review eligible":""}</p></td><td className="capitalize">{item.catch_up_status.replaceAll("_"," ")}{item.outstanding_count?` · ${item.outstanding_count} outstanding`:""}</td><td><PriorityBadge status={item.attention_status}/><p className="mt-1 max-w-xs text-slate-500">{item.attention_reason}</p></td></tr>)}</tbody></table>{!attention.length&&<p className="mt-5 rounded-xl bg-slate-50 p-5 text-slate-600">No students match the current filters. <Link className="link" href="/dashboard">Clear filters</Link></p>}</section>}

    {totalStudentCount>0&&<section className="card mt-6"><p className="eyebrow">Teaching-sequence milestones</p><h2 className="mt-2 text-2xl font-bold">Upcoming progress checks</h2><p className="mt-2 text-sm text-slate-600">Derived from each group&apos;s teaching-week clock. College holidays and closures do not consume a teaching week.</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{upcomingCheckpoints.map(item=><article className="rounded-xl border border-slate-200 p-4" key={item.classId}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{item.className}</h3><p className="mt-1 text-sm text-slate-600">Unit {item.unitCode} · now Teaching Week {item.teachingWeek}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">{journeyMilestoneLabel(item.milestone!.milestone)}</span></div><p className="mt-3 text-sm"><strong>Teaching Week {item.milestone!.week}:</strong> {item.milestone!.title}</p>{item.positionStatus==="paused"&&<p className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-950">Timer paused for a non-teaching period; resumes {formatJourneyDate(item.nextTeachingOn)}.</p>}<Link className="link mt-3 inline-block text-sm" href={`/teacher/classes/${item.classId}`}>Open group evidence →</Link></article>)}{!upcomingCheckpoints.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No active group journey has a further checkpoint in the current filters.</p>}</div></section>}

    {totalStudentCount>0&&<section className="card mt-6"><p className="eyebrow">Evidence signals</p><h2 className="mt-2 text-2xl font-bold">Completion, progress and action</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Signal label="Course starting point complete" value={assessmentCount("course_starting_point")}/>
      <Signal label="Unit starting point complete" value={assessmentCount("unit_starting_point")}/>
      <Signal label="Progress points complete" value={assessmentCount("progress_point")}/>
      <Signal label="Classwork complete" value={completionCount("in_class_practice")}/>
      <Signal label="Homework complete" value={completionCount("homework")}/>
      <Signal label="Overdue work" value={filteredCompletionEvidence.filter(row=>evidenceLearners.has(row.learnerId)&&row.status==="overdue").length} tone="risk"/>
      <Signal label="Significant improvement" value={improvementRows.filter(row=>Number(row.improvement_points)>=10).length} tone="good"/>
      <Signal label="No clear improvement" value={improvementRows.filter(row=>Number(row.improvement_points)<=0).length} tone="risk"/>
      <Signal label="Learners ready for Stretch" value={new Set(filteredMastery.filter(row=>row.current_pathway==="Stretch").map(row=>row.learner_id)).size}/>
      <Signal label="Learners ready for Mastery" value={new Set(filteredMastery.filter(row=>row.current_pathway==="Mastery").map(row=>row.learner_id)).size}/>
      <Signal label="Assessment readiness evidenced" value={assessmentReadyLearners.size} tone="good"/>
      <Signal label="Fast-tracked learners" value={routeCount("Fast-Tracked")} tone="good"/>
      <Signal label="Inactive learners" value={inactiveLearners} tone="risk"/>
      <Signal label="Targets due" value={activeTargets.filter(row=>["approved","active","extended"].includes(row.status)&&row.target_date>=todayIso).length}/>
      <Signal label="Targets achieved" value={activeTargets.filter(row=>row.status==="achieved").length} tone="good"/>
      <Signal label="Overdue targets" value={activeTargets.filter(row=>["approved","active","extended"].includes(row.status)&&row.target_date<todayIso).length} tone="risk"/>
      <Signal label="Actions awaiting review" value={actionsAwaitingReview} tone="risk"/>
    </div><p className="mt-4 text-sm text-slate-500">Counts are evidence records or distinct learners, not a single overall average. Assessment readiness requires at least 70% recorded mastery across every mapped skill in an active unit; it does not represent an official Pearson outcome. Open a class to drill down through learner and attempt history.</p></section>}

    {totalStudentCount>0&&<details className="card mt-6"><summary className="cursor-pointer text-lg font-bold">Filter this dashboard</summary><form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" method="get">
      <FilterSelect label="Academic year" name="academicYear" value={filters.academicYear} options={(years??[]).map(item=>({id:item.id,title:item.name}))}/>
      <FilterSelect label="Term / semester" name="period" value={filters.period} options={(periods??[]).map(item=>({id:item.id,title:item.name}))}/>
      <FilterSelect label="Course" name="course" value={filters.course} options={(courses??[]).map(item=>({id:item.id,title:item.title}))}/>
      <FilterSelect label="Class" name="class" value={filters.class} options={(classes??[]).map(item=>({id:item.id,title:item.name}))}/>
      <FilterSelect label="Student" name="student" value={filters.student} options={uniqueLearnerOptions(allAttention)}/>
      <FilterSelect label="Unit / Content Area" name="unit" value={filters.unit} options={(units??[]).map(item=>({id:item.id,title:`${item.code} · ${capitaliseFirst(item.title)}`}))}/>
      <FilterSelect label="Topic" name="topic" value={filters.topic} options={(topics??[]).map(item=>({id:item.id,title:capitaliseFirst(item.title)}))}/>
      <FilterSelect label="Skill" name="skill" value={filters.skill} options={(skills??[]).map(item=>({id:item.id,title:capitaliseFirst(item.title)}))}/>
      <FilterSelect label="Pathway" name="pathway" value={filters.pathway} options={["Support","Core","Stretch","Mastery"].map(item=>({id:item,title:item}))}/>
      <FilterSelect label="Activity type" name="activityType" value={filters.activityType} options={[["in_class_learning","Classroom learning"],["in_class_practice","Classwork"],["homework","Homework"],["revision","Revision"],["holiday_work","Holiday work"],["skills_practice","Practical skills"],["review_check","Review / progress check"]].map(([id,title])=>({id,title}))}/>
      <label className="grid gap-1 text-sm font-semibold">From date<input className="input" type="date" name="dateFrom" defaultValue={filters.dateFrom??""}/></label>
      <label className="grid gap-1 text-sm font-semibold">To date<input className="input" type="date" name="dateTo" defaultValue={filters.dateTo??""}/></label>
      <FilterSelect label="Completion status" name="completionStatus" value={filters.completionStatus} options={["assigned","started","completed","overdue","late","not_attempted"].map(item=>({id:item,title:item.replaceAll("_"," ")}))}/>
      <div className="flex items-end gap-3"><button className="button-secondary">Apply filters</button><Link className="link pb-3 text-sm" href="/dashboard">Clear</Link></div>
      <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">{filteredAttempts.filter(item=>selectedLearners.has(item.learner_id)).length} completed attempts match the activity/date filters · {filteredCompletionEvidence.filter(item=>selectedLearners.has(item.learnerId)).length} allocations match the completion filter · {selectedLearners.size} learners match all active filters.</p>
    </form></details>}

    {totalStudentCount>0&&<section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card"><h2 className="text-xl font-bold">Common misconceptions</h2><div className="mt-4 grid gap-3">{filteredMisconceptions.length ? filteredMisconceptions.slice(0,5).map((row, index) => <div key={index} className="rounded-xl bg-amber-50 p-4"><p className="font-semibold">{capitaliseFirst(related(row.misconceptions)?.title??"Recorded misconception")}</p><p className="mt-1 text-sm text-amber-900">{capitaliseFirst(related(related(row.misconceptions)?.skills)?.title??"Learning skill")} · seen {row.occurrence_count} times</p></div>) : <p className="text-slate-600">No misconception evidence recorded for the selected learners and curriculum scope.</p>}</div></div>
        <div className="card"><h2 className="text-xl font-bold">Gamification overview</h2><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Badges awarded" value={String(badges?.filter(item=>selectedLearners.has(item.learner_id)).length ?? 0)}/><Metric label="Net coins issued" value={String(coins?.filter(item=>selectedLearners.has(item.learner_id)).reduce((sum, item) => sum + Number(item.amount), 0) ?? 0)}/></div></div>
    </section>}
    </details>

    <details className="card mt-6">
      <summary className="cursor-pointer text-lg font-bold">Course catalogue and content preview</summary>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Reference</p><h2 className="mt-2 text-2xl font-bold">Complete Units / Content Areas</h2></div><Link className="link" href={role==="administrator"?"/teacher/content":"/curriculum"}>{role==="administrator"?"Open curriculum configuration":"Preview learner curriculum"} →</Link></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">{courses?.map(course => {
        const units = (course.units ?? []) as { id: string; code: string; title: string; kind: string; initial_teaching: boolean; status: string }[];
        return <article className="rounded-2xl border border-slate-200 p-5" key={course.id}>
          <p className="text-sm font-semibold text-teal-700">{course.qualification_type} · {course.qualification_level}</p>
          <h3 className="mt-2 text-xl font-bold">{capitaliseFirst(course.title)}</h3>
          <p className="mt-1 text-sm text-slate-500">{course.awarding_organisation} · {units.length} entries</p>
          <ol className="mt-4 max-h-80 space-y-2 overflow-auto pr-2 text-sm">{units.sort((a,b) => Number(a.code)-Number(b.code)).map(unit => <li className="rounded-lg bg-slate-50 px-3 py-2" key={unit.id}><strong>{unit.code.match(/^\d+$/) ? `${unit.code}. ` : ""}{capitaliseFirst(unit.title)}</strong><span className="ml-2 text-slate-500">{unit.kind.replaceAll("_"," ")}{unit.initial_teaching ? " · initial suggestion" : ""}</span></li>)}</ol>
        </article>;
      })}</div>
    </details>
  </main>;
}

function Metric({ label, value,description }: { label: string; value: string;description?:string }) { return <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p>{description&&<p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>}</div>; }
function JourneyFact({label,value}:{label:string;value:string}) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 font-semibold text-slate-900">{value}</p></div>; }
function journeyMilestoneLabel(value:string){return value==="starting_point"?"Starting Point":value==="progress_check_1"?"Progress Check 1":value==="progress_check_2"?"Progress Check 2":value==="final"?"Final / Summative":"Weekly Learning";}
function PriorityBadge({status}:{status:string}){const values:Record<string,[string,string]>={intervention_required:["Intervention Required","bg-red-100 text-red-900"],action_required:["Action Required","bg-orange-100 text-orange-950"],catch_up_required:["Catch-up Required","bg-amber-100 text-amber-950"],on_track:["On Track","bg-emerald-100 text-emerald-900"],exceeding:["Exceeding","bg-blue-100 text-blue-900"]};const [label,colour]=values[status]??[status.replaceAll("_"," "),"bg-slate-100 text-slate-900"];return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${colour}`}>{label}</span>}
function attentionRank(status:string){return ({intervention_required:0,action_required:1,catch_up_required:2,on_track:3,exceeding:4} as Record<string,number>)[status]??5}
function PriorityCount({label,value,status}:{label:string;value:number;status:string}){return <div className="rounded-xl border border-slate-200 p-4"><PriorityBadge status={status}/><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>}
function Signal({label,value,tone="neutral"}:{label:string;value:number;tone?:"neutral"|"good"|"risk"}){
  const colour=tone==="good"?"bg-teal-50 text-teal-900":tone==="risk"?"bg-amber-50 text-amber-950":"bg-slate-50 text-slate-900";
  return <div className={`rounded-xl p-4 ${colour}`}><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}
function FilterSelect({label,name,value,options}:{label:string;name:string;value?:string;options:{id:string;title:string}[]}){
  return <label className="grid gap-1 text-sm font-semibold">{label}<select className="input capitalize" name={name} defaultValue={value??""}><option value="">All</option>{options.map(option=><option value={option.id} key={option.id}>{option.title}</option>)}</select></label>;
}
function uniqueLearnerOptions(rows:TeacherAttentionRow[]){
  return [...new Map(rows.map(row=>[row.learner_id,{id:row.learner_id,title:row.display_name}])).values()]
    .sort((left,right)=>left.title.localeCompare(right.title));
}
function averageByLearner<T extends {learner_id:string}>(rows:T[],key:keyof T){
  const values=new Map<string,number[]>();
  for(const row of rows){
    const number=Number(row[key]);
    if(Number.isFinite(number))values.set(row.learner_id,[...(values.get(row.learner_id)??[]),number]);
  }
  return new Map([...values].map(([learnerId,items])=>[learnerId,Math.round(items.reduce((sum,item)=>sum+item,0)/items.length)]));
}
function activityUnitId(activityValue:unknown){
  const topic=activityTopic(activityValue);
  return typeof topic?.unit_id==="string"?topic.unit_id:null;
}
function activityTopicId(activityValue:unknown){
  const topic=activityTopic(activityValue);
  return typeof topic?.id==="string"?topic.id:null;
}
function activityTopic(activityValue:unknown){
  const activity=related(activityValue as Record<string,unknown>|Record<string,unknown>[]|null|undefined);
  const lesson=related(activity?.lessons as Record<string,unknown>|Record<string,unknown>[]|null|undefined);
  return related(lesson?.topics as Record<string,unknown>|Record<string,unknown>[]|null|undefined);
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
function formatJourneyDate(value:string|null){return value?new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}):"after the break";}
