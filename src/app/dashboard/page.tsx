import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { RoleBanner } from "@/components/role-banner";
import { CreateClassForm } from "@/components/class-forms";
import { unitByCode } from "@/lib/learning-catalog";
import { nextJourneyMilestone } from "@/lib/unit-journeys";
import { scopedTeacherAttention, selectTeacherDashboardLearners } from "@/lib/teacher-dashboard-filters";
import { summariseTeacherOverview } from "@/lib/dashboard-summary";
import { TeacherHomeDashboard } from "@/components/mini-study-teacher-home";
import { selectTeacherNextAction } from "@/lib/teacher-next-action";
import { matchCompletedAllocationIds } from "@/lib/class-report-model";
import { formatWeeklyLearningDays } from "@/lib/weekly-schedule";
import { classInvitationReadiness } from "@/lib/class-invitation-readiness";
import { TeacherGroupCard } from "@/components/teacher-group-card";
import { capitaliseFirst } from "@/lib/display-text";

type TeacherFilters={
  academicYear?:string;period?:string;course?:string;class?:string;unit?:string;
  topic?:string;skill?:string;student?:string;pathway?:string;activityType?:string;
  dateFrom?:string;dateTo?:string;completionStatus?:string;
};
type TeacherAttentionRow={classId:string;className:string;learner_id:string;display_name:string;current_score:number|null;progress_points:number|null;catch_up_status:string;outstanding_count:number;attention_status:string;attention_reason:string;ap_total:number;achievement_level:string|null;next_level:string|null;points_to_next:number;certificate_status:string|null};
type TeacherAttentionDb=Omit<TeacherAttentionRow,"classId"|"className"|"ap_total"|"achievement_level"|"next_level"|"points_to_next"|"certificate_status">;
type TeacherAchievementDb=Pick<TeacherAttentionRow,"learner_id"|"ap_total"|"achievement_level"|"next_level"|"points_to_next"|"certificate_status">;
type TeacherJourneySignal={classId:string;className:string;unitCode:string;teachingWeek:number;positionStatus:string;nextTeachingOn:string|null};

export default async function DashboardPage({searchParams}:{searchParams:Promise<TeacherFilters>}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role === "student") redirect("/study");
  const filters=await searchParams;
  return <><AppHeader name={profile.display_name} role={profile.role}/>
    {profile.role === "teacher"
        ? <TeacherHomeDashboard/>
        : <AdministratorDashboard role={profile.role} filters={filters}/>}
  </>;
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
      classId:item.classId,
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
async function currentTimestamp(){ return Date.now(); }
function formatJourneyDate(value:string|null){return value?new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}):"after the break";}
