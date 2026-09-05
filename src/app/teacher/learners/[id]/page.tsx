import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { CurriculumAttemptReviewForm } from "@/components/curriculum-attempt-review-form";
import { ActivityLockOverrideForm } from "@/components/safe-learning-admin-forms";
import {
  BulkApproveTargetsForm, CoinCorrectionForm, CreateTargetForm, FormativeResponseReviewForm,
  PathwayOverrideForm, SnapshotForm, TargetReviewForm, TeacherActionForm, TeacherNoteForm, WorkbookDecisionForm,
} from "@/components/learner-teacher-controls";
import { configuredUnits } from "@/lib/learning-catalog";
import { RecognitionForm } from "@/components/recognition-form";
import { TeacherSecondaryPanel } from "@/components/teacher-secondary-panel";
import { TeacherLearnerSummary } from "@/components/teacher-learner-summary";
import { currentCalendarQuarter, currentTeachingWeek } from "@/lib/report-periods";
import { applyWeeklyLearningGaps } from "@/lib/teacher-weekly-attention";
import {
  conciseCurrentJudgement, evidenceCounts, groupByTopic, hasValidComparableProgress,
  isPriorExperienceSkill, learnerReflectionLabel, reportTargetStatus, topicAssessmentStatus,
} from "@/lib/learner-report-model";
import {
  activityRecordInScope,
  feedbackRecordInScope,
  selectReportEnrolment,
  skillRecordInScope,
  targetRecordInScope,
  topicRecordInScope,
  type LearnerReportScope,
} from "@/lib/learner-report-scope";
import {
  summariseWorkbookStartingPoint,
  type WorkbookStartingPointSummary,
} from "@/lib/workbook-starting-point";

export default async function LearnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ classId?: string }>;
}) {
  const actor = await requireRole("teacher", "administrator");
  const { id } = await params;
  const requestedClassId = (await searchParams).classId;
  const supabase = await createClient();
  if (actor.role === "teacher") {
    const [{ data: compactLearner, error: learnerError }, { data: compactEnrolments, error: enrolmentError }] = await Promise.all([
      supabase.from("user_profiles").select("id,display_name").eq("id", id).eq("role", "student").single(),
      supabase.from("enrolments")
        .select("enrolled_at,classes(id,name,course_id,active_unit_id,courses(id,title))")
        .eq("student_id", id).is("archived_at", null),
    ]);
    if (learnerError || enrolmentError || !compactLearner) notFound();
    const compactChoices = (compactEnrolments ?? []).flatMap(enrolment => {
      const linkedClass = related(enrolment.classes);
      return linkedClass ? [{ classId: String(linkedClass.id), enrolment, linkedClass }] : [];
    });
    const compactSelection = requestedClassId
      ? selectReportEnrolment(compactChoices, requestedClassId)
      : compactChoices[0] ?? null;
    if (!compactSelection) notFound();
    const compactClass = compactSelection.linkedClass;
    const [journeyResult, attentionResult, gapResult, unitResult, targetResult] = await Promise.all([
      supabase.rpc("current_class_learning_journey", { class_uuid: compactClass.id }),
      supabase.rpc("class_learner_attention", { class_uuid: compactClass.id }),
      supabase.rpc("class_learner_weekly_gaps", { class_uuid: compactClass.id }),
      supabase.from("class_units").select("unit_id,active,units(id,code,title,archived_at)")
        .eq("class_id", compactClass.id).eq("active", true).is("archived_at", null),
      supabase.from("targets").select("id,status").eq("learner_id", id)
        .eq("class_id", compactClass.id).is("archived_at", null),
    ]);
    if (journeyResult.error || attentionResult.error || gapResult.error || unitResult.error || targetResult.error) {
      throw new Error("The student progress summary could not be loaded safely.");
    }
    const compactUnit = related(unitResult.data?.find(unit => unit.unit_id === compactClass.active_unit_id)?.units)
      ?? related(unitResult.data?.[0]?.units);
    const compactUnitCode = String(compactUnit?.code ?? "");
    const [baselineResult, attemptResult] = compactUnit ? await Promise.all([
      supabase.from("unit_starting_point_baselines")
        .select("percentage,recommended_level,completed_at").eq("learner_id", id)
        .eq("unit_id", compactUnit.id).maybeSingle(),
      supabase.from("learner_curriculum_attempts")
        .select("kind,topic_code,percentage,completed_at").eq("learner_id", id)
        .eq("unit_code", compactUnitCode).order("completed_at", { ascending: false }).limit(1),
    ]) : [{ data: null, error: null }, { data: [], error: null }];
    if (baselineResult.error || attemptResult.error) {
      throw new Error("The student unit summary could not be loaded safely.");
    }
    const compactAttention = applyWeeklyLearningGaps(
      (attentionResult.data ?? []).filter((row: { learner_id: string }) => row.learner_id === id),
      (gapResult.data ?? []).filter((row: { learner_id: string }) => row.learner_id === id),
    )[0];
    const latestAttempt = attemptResult.data?.[0];
    const activeTargets = (targetResult.data ?? []).filter(target => ["approved", "active", "extended"].includes(target.status));
    const week = currentTeachingWeek(new Date());
    const quarter = currentCalendarQuarter(new Date());
    const reportBase = `/api/reports/learners/${id}?classId=${compactClass.id}`;

    return <><AppHeader name={actor.display_name} role={actor.role}/><TeacherLearnerSummary
      attentionReason={compactAttention?.attention_reason ?? "The portal has not recorded a concern for this student."}
      attentionStatus={compactAttention?.attention_status ?? "on_track"}
      classChoices={compactChoices.map(choice => ({ id: choice.classId, name: String(choice.linkedClass.name) }))}
      courseTitle={String(related(compactClass.courses)?.title ?? "Course not recorded")}
      currentWeek={journeyResult.data?.[0]?.teaching_week == null ? null : Number(journeyResult.data[0].teaching_week)}
      groupHref={`/teacher/classes/${compactClass.id}`}
      groupName={String(compactClass.name)}
      latestTest={latestAttempt ? `${Number(latestAttempt.percentage)}% on ${formatDate(latestAttempt.completed_at)}` : "Not completed"}
      learnerHref={reportBase}
      learnerId={id}
      learnerName={compactLearner.display_name}
      quarterlyPeriod={quarter}
      startingPoint={baselineResult.data ? `${Number(baselineResult.data.percentage)}% ${baselineResult.data.recommended_level}` : "Not completed"}
      targetSummary={activeTargets.length ? `${activeTargets.length} active` : "No active target"}
      unitTitle={compactUnit ? `Unit ${compactUnit.code}: ${compactUnit.title}` : "No active unit"}
      weeklyPeriod={week}
    /></>;
  }
  const evidenceResults = await Promise.all([
    supabase.from("user_profiles").select("id,display_name").eq("id", id).eq("role", "student").single(),
    supabase.from("enrolments").select("enrolled_at,classes(id,name,course_id,courses(id,title),teachers:teacher_id(display_name))").eq("student_id", id).is("archived_at", null),
    supabase.from("attempts").select("id,activity_id,percentage,attempt_number,completed_at,pathway,hints_used,teacher_override_by,teacher_override_reason,activities(title,learning_stage,assessment_kind,lessons(topics(id,title,units(id,code,title,course_id))))").eq("learner_id", id).not("completed_at", "is", null).order("completed_at", { ascending: true }).limit(200),
    supabase.from("targets").select("id,class_id,course_id,unit_id,target_text,status,starts_on,target_date,review_on,reason,evidence,success_measure,current_progress,review_result,final_outcome,next_action,teacher_note,approved_by,approved_at,units(id,code,title,course_id),topics(id,title,units(id,code,title,course_id)),skills(id,title,topics(id,title,units(id,code,title,course_id))),activities:linked_activity_id(title),teachers:approved_by(display_name)").eq("learner_id", id).is("archived_at", null).order("target_date"),
    supabase.from("teacher_notes").select("id,class_id,note,created_at").eq("learner_id", id).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("skill_mastery").select("skill_id,mastery_score,current_pathway,attempts_count,hints_used,repeated_error_count,retrieval_score,skills(id,title,topics(id,title,units(id,code,title,course_id)))").eq("learner_id", id),
    supabase.from("learner_misconceptions").select("occurrence_count,first_seen_at,last_seen_at,resolved_at,misconceptions(title,reteach_guidance,skills(id,title,topics(id,title,units(id,code,title,course_id))))").eq("learner_id", id).order("occurrence_count", { ascending: false }),
    supabase.from("badge_awards").select("id,reason,awarded_at,badge_definitions(title)").eq("learner_id", id).order("awarded_at", { ascending: false }),
    supabase.from("coin_transactions").select("id,amount,description,created_at,transaction_status,balance_before,balance_after").eq("learner_id", id).order("created_at", { ascending: false }),
    supabase.from("retrieval_schedules").select("id,scheduled_for,status,completed_at,topics(id,title,units(id,code,title,course_id))").eq("learner_id", id).order("scheduled_for", { ascending: false }),
    supabase.from("skill_progress_comparisons").select("skill_id,starting_percentage,latest_percentage,improvement_points,status,evidence,skills(id,title,topics(id,title,units(id,code,title,course_id))),starting_result:starting_result_id(hints_used,difficulty,created_at,assessment_instances(completed_at,activities(title))),progress_result:latest_progress_result_id(hints_used,difficulty,created_at,assessment_instances(completed_at,activities(title)))").eq("learner_id", id),
    supabase.from("teacher_actions").select("id,class_id,action,reason,review_on,outcome,metadata,created_at").eq("learner_id", id).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("progress_snapshots").select("id,class_id,created_at,learner_reflection,next_priorities,snapshot_data,academic_periods(name),creators:created_by(display_name)").eq("learner_id", id).order("created_at", { ascending: false }),
    supabase.from("academic_periods").select("id,name").is("archived_at", null).order("starts_on"),
    supabase.from("formative_response_reviews").select("id,status,feedback,reviewed_mark,reviewed_at,reviewed_by,attempt_answers(answer,mark,max_mark,feedback,answered_at,attempts(id,activity_id,percentage,attempt_number,completed_at,hints_used,activities(title,assessment_kind,lessons(topics(id,title,units(id,code,title,course_id))))),questions(question_text,skills(id,title,topics(id,title,units(id,code,title,course_id)))))").eq("learner_id", id).order("created_at"),
    supabase.from("activities").select("id,title,assessment_kind,lessons(topics(id,title,units(id,code,title,course_id)))").eq("status", "approved").is("archived_at", null).order("title").limit(1000),
    supabase.from("assessment_instances").select("id,kind,completed_at,prior_experience,support_needs,aspirations,activities(title,assessment_kind,lessons(topics(id,title,units(id,code,title,course_id))))").eq("learner_id", id).order("completed_at"),
    supabase.from("activity_unlock_overrides").select("id,reason,expires_at,created_at,revoked_at,activities(title,assessment_kind,lessons(topics(id,title,units(id,code,title,course_id)))),teachers:teacher_id(display_name)").eq("learner_id", id).order("created_at", { ascending: false }),
    supabase.from("learner_curriculum_progress").select("unit_code,topic_code,selected_level,practice_score,hints_used,mastery_score,independent_attempts,retrieval_due_at,fast_track_reason,evidence").eq("learner_id", id),
    supabase.from("workbook_teacher_decisions").select("id,unit_code,topic_code,decision_type,original_route,new_route,reason,review_on,created_at,teachers:teacher_id(display_name)").eq("learner_id", id).order("created_at", { ascending: false }),
    supabase.from("learner_workbook_background").select("experience,support_needs,updated_at").eq("learner_id", id).maybeSingle(),
    supabase.from("learner_curriculum_attempts").select("id,kind,unit_code,topic_code,paper_mode,selected_level,percentage,mark,max_mark,hints_used,active_seconds,question_results,completed_at,teacher_mark,teacher_feedback,reviewed_at").eq("learner_id",id).order("completed_at",{ascending:false}).limit(100),
  ]);
  if(evidenceResults.some(result=>result.error))throw new Error("The learner record could not be loaded safely.");
  const [
    { data: learner }, { data: enrolments }, { data: allAttempts }, { data: allTargets },
    { data: notes }, { data: allMastery }, { data: allMisconceptions }, { data: badges },
    { data: coins }, { data: allRetrieval }, { data: allComparisons },
    { data: allTeacherActions }, { data: allSnapshots }, { data: periods },
    { data: allFormativeReviews }, { data: allApprovedActivities }, { data: allAssessmentInstances },
    { data: allOverrides }, { data: allWorkbookProgress }, { data: allWorkbookDecisions }, { data: workbookBackground }, { data: allCurriculumAttempts },
  ] = evidenceResults;
  if (!learner) notFound();

  const now = new Date();
  const enrolmentChoices = (enrolments ?? []).flatMap(enrolment => {
    const linkedClass = related(enrolment.classes);
    return linkedClass ? [{ classId: linkedClass.id, enrolment, linkedClass }] : [];
  });
  const selectedEnrolment = requestedClassId
    ? selectReportEnrolment(enrolmentChoices, requestedClassId)
    : enrolmentChoices[0] ?? null;
  if (requestedClassId && !selectedEnrolment) notFound();
  const classInfo = selectedEnrolment?.linkedClass;
  const courseInfo = related(classInfo?.courses);
  const teacherName = actor.display_name;
  const [{data:allCurriculumSkills,error:curriculumError},{data:recognitionTemplates,error:templateError},{data:classUnits,error:classUnitError}]=classInfo?await Promise.all([
    supabase.from("skills")
      .select("id,title,sort_order,topics!inner(id,title,units!inner(id,code,title,course_id))")
      .eq("status", "approved").is("archived_at", null)
      .eq("topics.units.course_id", classInfo.course_id).order("sort_order"),
    supabase.from("recognition_templates").select("id,title,category").eq("enabled",true).order("category"),
    supabase.from("class_units").select("unit_id,units(id,code,archived_at)")
      .eq("class_id",classInfo.id).eq("active",true).is("archived_at",null),
  ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}];
  if(curriculumError||templateError||classUnitError)throw new Error("The learner programme scope could not be loaded safely.");
  const selectedUnits=(classUnits??[]).flatMap(link=>{const unit=related(link.units);return unit&&!unit.archived_at?[{id:unit.id,code:unit.code}]:[];});
  const scope:LearnerReportScope={
    classId:String(classInfo?.id??""),
    courseId:String(classInfo?.course_id??""),
    unitIds:new Set(selectedUnits.map(unit=>unit.id)),
    unitCodes:new Set(selectedUnits.map(unit=>unit.code)),
  };
  const curriculumSkills=(allCurriculumSkills??[]).filter(item=>skillRecordInScope(scope,item));
  const attempts=(allAttempts??[]).filter(item=>activityRecordInScope(scope,item.activities));
  const targets=(allTargets??[]).filter(item=>targetRecordInScope(scope,item));
  const mastery=(allMastery??[]).filter(item=>skillRecordInScope(scope,item.skills));
  const misconceptions=(allMisconceptions??[]).filter(item=>skillRecordInScope(scope,related(item.misconceptions)?.skills));
  const retrieval=(allRetrieval??[]).filter(item=>topicRecordInScope(scope,item.topics));
  const comparisons=(allComparisons??[]).filter(item=>skillRecordInScope(scope,item.skills));
  const teacherActions=(allTeacherActions??[]).filter(item=>item.class_id===classInfo?.id);
  const snapshots=(allSnapshots??[]).filter(item=>item.class_id===classInfo?.id);
  const classNotes=(notes??[]).filter(item=>item.class_id===classInfo?.id);
  const historicalUnscopedNotes=(notes??[]).filter(item=>item.class_id==null);
  const formativeReviews=(allFormativeReviews??[]).filter(item=>feedbackRecordInScope(scope,item));
  const approvedActivities=(allApprovedActivities??[]).filter(item=>activityRecordInScope(scope,item));
  const assessmentInstances=(allAssessmentInstances??[]).filter(item=>
    item.kind==="course_starting_point"||activityRecordInScope(scope,item.activities));
  const overrides=(allOverrides??[]).filter(item=>activityRecordInScope(scope,item.activities));
  const workbookProgress=(allWorkbookProgress??[]).filter(item=>scope.unitCodes.has(item.unit_code));
  const workbookDecisions=(allWorkbookDecisions??[]).filter(item=>scope.unitCodes.has(item.unit_code));
  const curriculumAttempts=(allCurriculumAttempts??[]).filter(item=>scope.unitCodes.has(item.unit_code));
  const workbookStartingPoints = configuredUnits.flatMap(unit => {
    if (!scope.unitCodes.has(unit.code)) return [];
    const summary = summariseWorkbookStartingPoint(
      workbookProgress,
      unit.code,
      unit.topics.map(topic => topic.code),
    );
    return summary ? [{ unit, summary }] : [];
  });
  const[{data:achievementRows,error:achievementError},{data:recognitions,error:recognitionError}]=await Promise.all([
    supabase.rpc("learner_achievement_summary",{learner_uuid:id}),
    classInfo?supabase.from("learner_recognitions").select("id,title,message,recognised_at").eq("learner_id",id).eq("class_id",classInfo.id).order("recognised_at",{ascending:false}):Promise.resolve({data:[],error:null}),
  ]);
  if(achievementError||recognitionError)throw new Error("The learner achievement context could not be loaded safely.");
  const achievement=achievementRows?.[0];

  const academicSkills = (curriculumSkills ?? []).filter(skill =>
    !isPriorExperienceSkill(skill.title) && String(related(skill.topics)?.title ?? "").toLowerCase() !== "course starting point");
  const academicComparisons = (comparisons ?? []).filter(row =>
    !isPriorExperienceSkill(related(row.skills)?.title ?? "") && !isCourseStartingPointComparison(row));
  const backgroundComparisons = (comparisons ?? []).filter(row =>
    isPriorExperienceSkill(related(row.skills)?.title ?? "") || isCourseStartingPointComparison(row));
  const activeTargets = (targets ?? []).filter(target => ["approved", "active", "extended"].includes(target.status));
  const achievedTargets = (targets ?? []).filter(target => target.status === "achieved");
  const nextReview = [...(targets ?? []).map(target => target.review_on), ...(teacherActions ?? []).map(action => action.review_on)]
    .filter((value): value is string => Boolean(value)).sort()
    .find(value => new Date(`${value}T23:59:59`) >= now) ?? null;

  const topicRows = academicSkills.map(skill => {
    const comparison = academicComparisons.find(row => row.skill_id === skill.id);
    const skillMastery = (mastery ?? []).find(row => row.skill_id === skill.id);
    const topic = related(skill.topics); const unit = related(topic?.units);
    const counts = evidenceCounts(comparison?.evidence);
    const valid = comparison ? hasValidComparableProgress({
      latestPercentage: nullableNumber(comparison.latest_percentage),
      improvementPoints: nullableNumber(comparison.improvement_points),
      evidence: comparison.evidence,
      progressDate: assessmentDate(comparison.progress_result),
    }) : false;
    return {
      unitTitle: unit ? `${unit.code}: ${unit.title}` : "Course starting point and learner background",
      topicTitle: topic?.title ?? "Topic not linked",
      topicId: topic?.id,
      skill, comparison, skillMastery, counts, valid,
    };
  });
  const topicGroups = groupByTopic(topicRows);
  const completedCycles = (formativeReviews ?? []).map(review => feedbackCycle(review, attempts ?? []))
    .filter(cycle => cycle.feedback && cycle.followUp);
  const latestSnapshot = snapshots?.find(snapshot => snapshot.learner_reflection) ?? snapshots?.[0];
  const latestSnapshotData = asRecord(latestSnapshot?.snapshot_data);
  const coinBalance = (coins ?? []).filter(item => item.transaction_status !== "reversed")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const curriculumPractice = (curriculumAttempts ?? []).filter(item => item.kind === "topic_practice");
  const curriculumPapers = (curriculumAttempts ?? []).filter(item => item.kind === "practice_paper");
  const curriculumNeeds = curriculumPractice.filter(item => Number(item.percentage) < 75);
  const curriculumStrengths = curriculumPractice.filter(item => Number(item.percentage) >= 75);

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href={classInfo ? `/teacher/classes/${classInfo.id}` : "/dashboard"}>← {classInfo?.name ?? "Teacher dashboard"}</Link>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Learner evidence record</p><h1 className="mt-2 text-4xl font-bold">{learner.display_name}</h1><p className="mt-2 text-slate-600">{courseInfo?.title ?? "Course not recorded"}</p></div>
      <div className="flex flex-wrap gap-3">{classInfo?<><a className="button-secondary" href={`/api/reports/learners/${id}?classId=${classInfo.id}&format=csv`}>Download spreadsheet</a><a className="button" href={`/api/reports/learners/${id}?classId=${classInfo.id}`}>Download learner report</a></>:<span className="text-sm text-slate-500">No active group is available for reporting.</span>}</div>
    </div>

    {enrolmentChoices.length>1&&<nav aria-label="Choose learner class" className="card mt-6"><p className="text-sm font-bold">Report programme</p><div className="mt-3 flex flex-wrap gap-2">{enrolmentChoices.map(choice=><Link className={choice.classId===classInfo?.id?"button":"button-secondary"} href={`/teacher/learners/${id}?classId=${choice.classId}`} key={choice.classId}>{choice.linkedClass.name}</Link>)}</div></nav>}

    {classInfo&&<details className="card mt-6">
      <summary className="cursor-pointer text-lg font-bold">Download a report for selected dates</summary>
      <p className="mt-3 max-w-3xl text-sm text-slate-600">Choose an inclusive evidence period. The export includes dated records from that window and clearly omits current totals that cannot be reconstructed historically.</p>
      <form action={`/api/reports/learners/${id}`} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end" method="get">
        <input name="classId" type="hidden" value={classInfo.id}/>
        <label className="grid gap-1 text-sm font-semibold">From<input className="input" name="from" required type="date"/></label>
        <label className="grid gap-1 text-sm font-semibold">To<input className="input" name="to" required type="date"/></label>
        <div className="flex flex-wrap gap-2"><button className="button" type="submit">Period PDF</button><button className="button-secondary" name="format" type="submit" value="csv">Period CSV</button></div>
      </form>
    </details>}

    <section className="card mt-8"><p className="eyebrow">1. Learner overview</p><h2 className="mt-2 text-2xl font-bold">At a glance</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Summary label="Learner" value={learner.display_name}/><Summary label="Course" value={courseInfo?.title ?? "Not recorded"}/>
        <Summary label="Teacher" value={teacherName}/><Summary label="Enrolment date" value={formatDate(selectedEnrolment?.enrolment.enrolled_at)}/>
        <Summary label="Report date" value={now.toLocaleDateString("en-GB")}/>
        <Summary label="Starting-point status" value={overviewStartingStatus(topicGroups, workbookStartingPoints)}/>
        <Summary label="Current progress status" value={topicGroups.some(group => group.items.some(item => item.valid)) ? "Comparable progress evidence is available." : "No comparable progress-point assessment has been completed yet."}/>
        <Summary label="Active / achieved targets" value={`${activeTargets.length} / ${achievedTargets.length}`}/>
        <Summary label="Next review date" value={formatDate(nextReview)}/>
        <Summary label="Computing Achievement" value={`${achievement?.ap_total??0} AP · ${achievement?.current_level_title??"Building toward Bronze"}`}/>
      </div>
    </section>

    <TeacherSecondaryPanel>

    <section><p className="eyebrow">2. Starting-point summary by topic</p><h2 className="mt-2 text-2xl font-bold">What the initial evidence shows</h2>
      <div className="mt-5 grid gap-5">
        {workbookStartingPoints.map(item => <WorkbookStartingPointCard key={item.unit.code} unit={item.unit} summary={item.summary}/>)}
        {topicGroups.map(group => <TopicSummaryCard key={`${group.unitTitle}-${group.topicTitle}`} group={group}/>)}
        {!workbookStartingPoints.length&&!topicGroups.length&&<Empty text="No starting-point evidence has been recorded yet."/>}
      </div>
    </section>

    <section className="mt-6"><p className="eyebrow">3. Topic progress and feedback</p><h2 className="mt-2 text-2xl font-bold">Skills within each topic</h2>
      <div className="mt-5 grid gap-6">{topicGroups.map(group => {
        const topicTarget = (targets ?? []).find(target => related(target.topics)?.id === group.items[0]?.topicId || related(target.skills)?.id && group.items.some(item => item.skill.id === related(target.skills)?.id));
        const topicFeedback = (formativeReviews ?? []).find(review => feedbackTopicId(review) === group.items[0]?.topicId);
        const cycle = topicFeedback ? feedbackCycle(topicFeedback, attempts ?? []) : null;
        const gap = topicGap(group, misconceptions ?? []);
        return <article className="card" key={`${group.unitTitle}-${group.topicTitle}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{group.unitTitle}</p><h3 className="mt-2 text-xl font-bold">{group.topicTitle}</h3></div><StatusBadge status={topicStatus(group)}/></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-slate-500"><tr><th className="pb-3">Skill</th><th className="pb-3">Starting point</th><th className="pb-3">Latest progress</th><th className="pb-3">Support used</th><th className="pb-3">Change</th><th className="pb-3">Current judgement</th></tr></thead>
            <tbody>{group.items.map(item => <tr className="border-t border-slate-200 align-top" key={item.skill.id}><td className="py-3 pr-3 font-semibold">{item.skill.title}</td><td className="py-3 pr-3">{startingCell(item)}</td><td className="py-3 pr-3">{item.valid ? `${item.comparison?.latest_percentage}%` : "Not yet assessed"}</td><td className="py-3 pr-3">{supportCell(item)}</td><td className="py-3 pr-3">{item.valid ? `${signed(item.comparison?.improvement_points)} points` : "Not calculable"}</td><td className="py-3"><JudgementBadge value={conciseCurrentJudgement({
              startingQuestionCount: item.counts.startingQuestionCount, startingSufficient: item.counts.startingSufficient,
              progressSufficient: item.counts.progressSufficient, validComparableProgress: item.valid,
              hintsUsed: Number(resultValue(item.comparison?.progress_result, "hints_used") ?? 0),
              latestPercentage: nullableNumber(item.comparison?.latest_percentage),
            })}/></td></tr>)}</tbody>
          </table></div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <CompactFact label="Main identified gap" value={String(gap)}/>
            <CompactFact label="Teacher feedback or intervention" value={cycle?.feedback ?? actionForTopic(teacherActions ?? [], group.items[0]?.topicTitle) ?? "No teacher feedback and follow-up evidence has been recorded for this topic yet."}/>
            {cycle?.feedback && <><CompactFact label="Learner response" value={cycle.learnerResponse}/><CompactFact label="Improvement after feedback" value={cycle.improvement}/></>}
            <CompactFact label="Current topic target" value={topicTarget?.target_text ?? "No current topic target."}/>
            <CompactFact label="Next review date" value={formatDate(topicTarget?.review_on ?? null)}/>
          </div>
        </article>;
      })}</div>
    </section>

      {classInfo&&<RecognitionForm learnerId={id} classId={classInfo.id} templates={recognitionTemplates??[]}/>}

    <section className="card"><p className="eyebrow">Atom-style practice evidence</p><h2 className="mt-2 text-2xl font-bold">Question sessions, papers and learning needs</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Summary label="Topic sessions" value={String(curriculumPractice.length)}/><Summary label="Secure sessions" value={String(curriculumStrengths.length)}/><Summary label="Need more practice" value={String(curriculumNeeds.length)}/><Summary label="Practice papers" value={String(curriculumPapers.length)}/></div>
      {curriculumNeeds.length ? <div className="mt-6"><h3 className="font-bold">Priority topics</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{curriculumNeeds.slice(0,6).map(item=><div className="rounded-xl bg-amber-50 p-4" key={item.id}><p className="text-xs font-bold uppercase text-amber-900">Unit {item.unit_code} · {item.topic_code}</p><p className="mt-1 font-bold">{Math.round(Number(item.percentage))}% · {item.hints_used} hint(s)</p><p className="mt-1 text-sm">Revisit teaching, then complete a fresh comparable session.</p></div>)}</div></div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-slate-600">No below-threshold topic sessions have been recorded.</p>}
      <h3 className="mt-6 font-bold">Recent question and paper history</h3><div className="mt-3 grid gap-3">{(curriculumAttempts ?? []).slice(0,10).map(item=>{
        const responses=Array.isArray(item.question_results)?item.question_results as {id?:string;answer?:string;marks?:number}[]:[];
        const hasOpenResponses=item.kind==="practice_paper"&&responses.some(response=>typeof response.answer==="string");
        return <article className="border-t border-slate-200 py-4 text-sm" key={item.id}><div className="flex flex-wrap justify-between gap-3"><span><strong>{formatDate(item.completed_at)}</strong> · Unit {item.unit_code}{item.topic_code?` · ${item.topic_code}`:` · ${item.paper_mode??"applied"} paper`} · {item.selected_level??"mixed difficulty"}</span><span>{hasOpenResponses&&item.teacher_mark==null?<strong className="text-amber-800">Awaiting teacher review</strong>:<>{Math.round(Number(item.percentage))}% · {item.mark}/{item.max_mark} marks</>} · {item.hints_used} hints · {formatDuration(item.active_seconds)}</span></div>
          {hasOpenResponses&&<details className="mt-3 rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer font-bold">Review submitted answers and award the final mark</summary><div className="mt-4 grid gap-3">{responses.map((response,index)=><div className="rounded-lg bg-white p-3" key={`${response.id??index}`}><p className="text-xs font-bold uppercase text-slate-500">Activity {index+1} · up to {response.marks??"?"} marks</p><pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{response.answer||"No response supplied."}</pre></div>)}</div><CurriculumAttemptReviewForm attemptId={item.id} learnerId={id} maxMark={item.max_mark} currentMark={item.teacher_mark} currentFeedback={item.teacher_feedback}/></details>}
          {item.teacher_feedback&&<p className="mt-3 rounded-xl bg-teal-50 p-3"><strong>Teacher feedback:</strong> {item.teacher_feedback} {item.reviewed_at&&<span className="text-slate-600">· reviewed {formatDate(item.reviewed_at)}</span>}</p>}
        </article>})}{!curriculumAttempts?.length&&<Empty text="No Atom-style question sessions or papers recorded yet."/>}</div>
    </section>

    <section className="card mt-6"><p className="eyebrow">4. Feedback, action and improvement</p><h2 className="mt-2 text-2xl font-bold">Starting point → feedback → action → reassessment → improvement</h2>
      <div className="mt-5 grid gap-4">{completedCycles.length ? completedCycles.map(cycle => <div className="rounded-xl border border-slate-200 p-4" key={cycle.id}>
        <p className="font-semibold">{cycle.parent} · {cycle.skill}</p>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><CompactFact label="Original evidence" value={cycle.original}/><CompactFact label="Feedback given" value={cycle.feedback ?? "No feedback recorded"}/><CompactFact label="Learner action" value={cycle.learnerAction}/><CompactFact label="Follow-up evidence" value={cycle.followUpText}/><CompactFact label="Improvement" value={cycle.improvement}/><CompactFact label="Teacher judgement" value={cycle.teacherJudgement}/><CompactFact label="Next action" value={cycle.nextAction}/></div>
      </div>) : <Empty text="No completed feedback-and-improvement cycle has been recorded yet."/>}</div>
    </section>

    <section className="card mt-6"><p className="eyebrow">5. Targets and next steps</p><h2 className="mt-2 text-2xl font-bold">Current measurable priorities</h2>
      {targets?.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-slate-500"><tr><th className="pb-3">Status</th><th className="pb-3">Unit / topic</th><th className="pb-3">Target</th><th className="pb-3">Baseline</th><th className="pb-3">Success measure</th><th className="pb-3">Deadline</th><th className="pb-3">Review date</th></tr></thead><tbody>{targets.map(target => {
        const warning = !target.review_on ? "Review date needs to be added." : !target.success_measure ? "Success measure needs to be added." : null;
        return <tr className="border-t border-slate-200 align-top" key={target.id}><td className="py-4 pr-3"><StatusBadge status={reportTargetStatus(target.status, target.target_date, now)}/></td><td className="py-4 pr-3">{targetParent(target)}</td><td className="py-4 pr-3 font-semibold">{target.target_text}</td><td className="py-4 pr-3">{target.reason}</td><td className="py-4 pr-3">{target.success_measure ?? "To be completed"}</td><td className="py-4 pr-3">{formatDate(target.target_date)}</td><td className="py-4">{formatDate(target.review_on)}{warning && <p className="mt-1 text-xs font-semibold text-amber-800">{warning}</p>}</td></tr>;
      })}</tbody></table></div> : <Empty text="No targets have been recorded yet."/>}
      <details className="mt-6 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-semibold">Teacher target controls</summary>
        {classInfo && <CreateTargetForm learnerId={id} classId={classInfo.id} skills={academicSkills.map(skill => ({ id: skill.id, title: skill.title }))}/>}
        <BulkApproveTargetsForm learnerId={id} targetIds={(targets ?? []).filter(target => target.status === "proposed").map(target => target.id)}/>
        <div className="mt-4 grid gap-4">{targets?.map(target => <div className="rounded-xl bg-slate-50 p-4" key={target.id}><TargetReviewForm target={target}/></div>)}</div>
      </details>
    </section>

    <section className="card mt-6"><p className="eyebrow">6. Reflection and evidence history</p><h2 className="mt-2 text-2xl font-bold">Reflection, recent assessments and retrieval</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Summary label="Latest learner reflection" value={learnerReflectionLabel(latestSnapshot?.learner_reflection)}/>
        <Summary label="Teacher response" value={String(latestSnapshotData.teacher_response ?? "No teacher response recorded.")}/>
        <Summary label="Retrieval check date" value={formatDate(retrieval?.find(item => item.status !== "cancelled")?.scheduled_for ?? null)}/>
      </div>
      <h3 className="mt-6 text-lg font-bold">Recent assessment timeline</h3>
      <div className="mt-3 grid gap-2">
        {workbookStartingPoints.map(item=><div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 py-3 text-sm" key={`starting-${item.unit.code}`}><span><strong>{formatDate(item.summary.completedAt)}</strong> · Unit {item.unit.code} {item.unit.title} · starting point</span><span>{item.summary.mark}/{item.summary.maxMark} · {item.summary.percentage}% · {item.summary.recommendedLevel??"route pending"}</span></div>)}
        {[...(attempts ?? [])].reverse().slice(0, 8).map(attempt => <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 py-3 text-sm" key={attempt.id}><span><strong>{formatDate(attempt.completed_at)}</strong> · {parentFromActivity(attempt.activities)} · {related(attempt.activities)?.title}</span><span>{attempt.percentage}% · {attempt.hints_used} hints</span></div>)}
      </div>

      <details className="mt-6 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-lg font-bold">Additional evidence</summary>
        <div className="mt-5 grid gap-6">
          <AdditionalBlock title="Full assessment history">{assessmentInstances?.length ? assessmentInstances.map(item => <p key={item.id}>{formatDate(item.completed_at)} · {item.kind.replaceAll("_", " ")} · {related(item.activities)?.title}</p>) : <Empty text="No formal assessment history recorded."/>}</AdditionalBlock>
          <AdditionalBlock title="Course starting point and learner background">{backgroundComparisons.length ? backgroundComparisons.map(item => <p key={item.skill_id}>{related(item.skills)?.title}: {item.starting_percentage}% recorded response <span className="text-slate-500">{isPriorExperienceSkill(related(item.skills)?.title ?? "") ? "(self-reported, not academic mastery)" : "(course-level starting point, excluded from unit mastery)"}</span></p>) : <Empty text="Course starting point and learner background not yet recorded."/>}</AdditionalBlock>
          <AdditionalBlock title="Organisation-wide achievement and class recognition"><p>{achievement?.ap_total??0} AP · {achievement?.current_level_title??"Building toward Bronze"} · {badges?.length??0} badges. Cosmetic coin balance: {coinBalance}. Achievement totals and badges span the learner&apos;s organisation; recognitions below are for this class.</p>{recognitions?.map(item=><p key={item.id}>{formatDate(item.recognised_at)} · {item.title}: {item.message}</p>)}{badges?.map(item => <p key={item.id}>{formatDate(item.awarded_at)} · {related(item.badge_definitions)?.title}</p>)}</AdditionalBlock>
          <AdditionalBlock title="Organisation-wide coin ledger">{coins?.slice(0, 20).map(item => <p key={item.id}>{formatDate(item.created_at)} · {item.description} · {Number(item.amount) > 0 ? "+" : ""}{item.amount}</p>)}</AdditionalBlock>
          <AdditionalBlock title="Audit and teacher actions">{teacherActions?.length ? teacherActions.map(item => <p key={item.id}>{formatDate(item.created_at)} · {item.action}: {item.reason}{item.outcome ? ` · ${item.outcome}` : ""}</p>) : <Empty text="No teacher actions recorded."/>}</AdditionalBlock>
          <AdditionalBlock title="Exceptional-access records">{overrides?.length ? overrides.map(item => <p key={item.id}>{formatDate(item.created_at)} · {related(item.activities)?.title} · {item.reason}</p>) : <Empty text="No exceptional-access records."/>}</AdditionalBlock>
          <AdditionalBlock title="Term snapshots">{snapshots?.length ? snapshots.map(item => <p key={item.id}>{formatDate(item.created_at)} · {related(item.academic_periods)?.name} · {item.next_priorities ?? "No next priority recorded"}</p>) : <Empty text="No term snapshots recorded."/>}</AdditionalBlock>
          <AdditionalBlock title="Selected-unit misconceptions">{misconceptions?.length ? misconceptions.map((item, index) => <p key={index}>{related(item.misconceptions)?.title} · {item.occurrence_count} occurrence(s)</p>) : <Empty text="No selected-unit misconception evidence recorded."/>}</AdditionalBlock>
          <AdditionalBlock title="Private teacher notes for this class">{classNotes.length ? classNotes.map(item => <p key={item.id}>{formatDate(item.created_at)} · {item.note}</p>) : <Empty text="No private note has been recorded for this learner in the selected class."/>}{classInfo ? <TeacherNoteForm learnerId={id} classId={classInfo.id}/> : null}</AdditionalBlock>
          {historicalUnscopedNotes.length ? <AdditionalBlock title="Historical notes without a class boundary">{historicalUnscopedNotes.map(item => <p key={item.id}>{formatDate(item.created_at)} · {item.note} <span className="text-slate-500">(historical teacher-owned note; excluded from class-scoped evidence)</span></p>)}</AdditionalBlock> : null}
          <AdditionalBlock title="Adaptive workbook evidence">{workbookBackground && <p><strong>Self-reported background (not mastery):</strong> {workbookBackground.experience || "No experience supplied"} · Support needs: {workbookBackground.support_needs || "None supplied"}</p>}{workbookProgress?.length ? workbookProgress.map((item, index) => <p key={`${item.unit_code}-${item.topic_code}-${index}`}>Unit {item.unit_code} · {item.topic_code} · {item.selected_level} · {item.independent_attempts ?? 0} independent mastery attempts · {item.mastery_score == null ? "not mastered" : `${item.mastery_score}%`}{item.fast_track_reason ? ` · Fast-track reason: ${item.fast_track_reason}` : ""}{item.retrieval_due_at ? ` · Retrieval ${formatDate(item.retrieval_due_at)}` : ""}</p>) : <Empty text="No adaptive workbook evidence has been recorded yet."/>}{workbookDecisions?.map(item => <p key={item.id}>{formatDate(item.created_at)} · {item.decision_type.replaceAll("_"," ")} · Unit {item.unit_code}{item.topic_code ? ` / ${item.topic_code}` : ""} · {item.reason}{item.original_route ? ` · ${item.original_route} → ${item.new_route}` : ""}</p>)}</AdditionalBlock>
          <AdditionalBlock title="Teacher tools">
            <WorkbookDecisionForm learnerId={id} units={configuredUnits.filter(unit=>scope.unitCodes.has(unit.code)).map(unit => ({ code: unit.code, title: unit.title, topics: unit.topics.map(topic => ({ code: topic.code, title: topic.title })) }))}/>
            {classInfo && <TeacherActionForm learnerId={id} classId={classInfo.id}/>}
            {actor.role==="administrator"&&classInfo&&<SnapshotForm learnerId={id} classId={classInfo.id} periods={periods ?? []}/>}
            {actor.role==="administrator"&&<CoinCorrectionForm learnerId={id}/>}
            <PathwayOverrideForm learnerId={id} skills={(mastery ?? []).filter(row => !isPriorExperienceSkill(related(row.skills)?.title ?? "")).map(row => ({ skill_id: row.skill_id, title: related(row.skills)?.title ?? "Skill", pathway: row.current_pathway }))}/>
            <ActivityLockOverrideForm learnerId={id} activities={approvedActivities ?? []}/>
            {formativeReviews?.filter(review => review.status === "pending").map(review => {
              const answer = related(review.attempt_answers);
              return <FormativeResponseReviewForm key={review.id} learnerId={id} review={{ id: review.id, answer: formatAnswer(answer?.answer), question: related(answer?.questions)?.question_text ?? "Extended response", maxMark: Number(answer?.max_mark ?? 0) }}/>;
            })}
          </AdditionalBlock>
        </div>
      </details>
    </section>
    </TeacherSecondaryPanel>
  </main></>;
}

type TopicItem = {
  unitTitle: string; topicTitle: string; topicId: string | undefined;
  skill: { id: string; title: string }; comparison: Record<string, unknown> | undefined;
  skillMastery: Record<string, unknown> | undefined;
  counts: ReturnType<typeof evidenceCounts>; valid: boolean;
};
type TopicGroup = { unitTitle: string; topicTitle: string; items: TopicItem[] };

function WorkbookStartingPointCard({
  unit,
  summary,
}: {
  unit: (typeof configuredUnits)[number];
  summary: WorkbookStartingPointSummary;
}) {
  return <article className="card border-teal-200 bg-teal-50">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="eyebrow">Unit {unit.code}</p><h3 className="mt-2 text-xl font-bold">{unit.title}</h3></div>
      <StatusBadge status={summary.complete?"Baseline established":"Partially assessed"}/>
    </div>
    <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <CompactFact label="Starting-point date" value={formatDate(summary.completedAt)}/>
      <CompactFact label="Independent result" value={`${summary.mark} of ${summary.maxMark} · ${summary.percentage}%`}/>
      <CompactFact label="Recommended route" value={`${summary.recommendedLevel??"Not yet available"}. This changes support inside the unit, not the learner's group or timetable.`}/>
      <CompactFact label="Evidence strength" value={summary.complete?"Three independent, unhinted questions are stored for every configured topic.":"The diagnostic is incomplete and is not treated as a secure unit baseline."}/>
    </dl>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{summary.topics.map(topic => {
      const configuredTopic=unit.topics.find(item=>item.code===topic.topicCode);
      return <div className="rounded-xl bg-white p-4 text-sm" key={topic.topicCode}>
        <p className="font-bold">{topic.topicCode} · {configuredTopic?.title??"Topic"}</p>
        <p className="mt-1">{topic.mark} of {topic.maxMark} correct · {topic.percentage}%</p>
        <p className="mt-1 text-xs text-slate-600">{topic.skills.length?topic.skills.join(", "):"Mapped diagnostic skills not labelled."}</p>
      </div>;
    })}</div>
  </article>;
}

function TopicSummaryCard({ group }: { group: TopicGroup }) {
  const sampled = group.items.filter(item => item.counts.startingQuestionCount > 0);
  const secure = group.items.filter(item => item.counts.startingSufficient);
  const progressed = group.items.filter(item => item.valid);
  const date = firstDate(sampled.map(item => assessmentDate(item.comparison?.starting_result)));
  const positive = sampled.filter(item => Number(item.comparison?.starting_percentage ?? 0) > 0).map(item => item.skill.title);
  const low = sampled.filter(item => Number(item.comparison?.starting_percentage ?? 0) === 0).map(item => item.skill.title);
  const status = topicAssessmentStatus({ sampledSkills: sampled.length, totalSkills: group.items.length, secureBaselineSkills: secure.length, completedProgressSkills: progressed.length });
  return <article className="card"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{group.unitTitle}</p><h3 className="mt-2 text-xl font-bold">{group.topicTitle}</h3></div><StatusBadge status={status}/></div>
    <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <CompactFact label="Starting-point date" value={date}/><CompactFact label="Skills sampled" value={`${sampled.length} of ${group.items.length}: ${sampled.map(item => item.skill.title).join(", ") || "None"}`}/>
      <CompactFact label="Starting-point result" value={sampled.length ? `${sampled.length} skills sampled; no secure topic percentage is calculated.` : "Not started"}/>
      <CompactFact label="Evidence strength" value={secure.length === group.items.length ? "Sufficient to establish a baseline" : sampled.length ? "Limited: one question per sampled skill" : "No evidence yet"}/>
      <CompactFact label="Initial strengths" value={positive.length ? `Positive initial indications: ${positive.join(", ")}. These are not yet secure strengths.` : "No secure strengths have been established yet because the baseline evidence is limited."}/>
      <CompactFact label="Initial gaps" value={low.length ? `Lowest initial indication: ${low.join(", ")}.` : "Further assessment is required before support needs can be confirmed."}/>
      <CompactFact label="Next step" value={secure.length < group.items.length ? "Complete a fuller baseline assessment." : progressed.length ? "Review the progress-point evidence." : "Complete a comparable progress-point assessment."}/>
    </dl>
  </article>;
}

function topicStatus(group: TopicGroup) {
  return topicAssessmentStatus({
    sampledSkills: group.items.filter(item => item.counts.startingQuestionCount > 0).length,
    totalSkills: group.items.length,
    secureBaselineSkills: group.items.filter(item => item.counts.startingSufficient).length,
    completedProgressSkills: group.items.filter(item => item.valid).length,
  });
}
function overviewStartingStatus(
  groups: TopicGroup[],
  workbookStartingPoints: { unit: (typeof configuredUnits)[number]; summary: WorkbookStartingPointSummary }[],
) {
  if (workbookStartingPoints.length) return workbookStartingPoints.map(({unit,summary}) =>
    `Unit ${unit.code}: ${summary.mark} of ${summary.maxMark} (${summary.percentage}%) · ${summary.recommendedLevel??"route pending"}`,
  ).join(" · ");
  if (!groups.length) return "No starting-point topics are available.";
  const labels = groups.map(group => topicStatus(group));
  const partial = labels.filter(label => label === "Partially assessed").length;
  const established = labels.filter(label => label === "Baseline established").length;
  const notStarted = labels.filter(label => label === "Not started").length;
  return `${partial} partially assessed · ${established} baseline established · ${notStarted} not started. Limited evidence is not a secure baseline.`;
}
function startingCell(item: TopicItem) {
  if (!item.counts.startingQuestionCount) return "Not assessed";
  if (!item.counts.startingSufficient) return "Initial indication: limited evidence";
  return `${item.comparison?.starting_percentage}%`;
}
function supportCell(item: TopicItem) {
  const start = Number(resultValue(item.comparison?.starting_result, "hints_used") ?? 0);
  const progress = Number(resultValue(item.comparison?.progress_result, "hints_used") ?? 0);
  if (start + progress === 0) return "None recorded";
  return `${start} baseline / ${progress} progress hints`;
}
function topicGap(group: TopicGroup, misconceptions: { misconceptions: unknown }[]) {
  const linked = misconceptions.find(item => {
    const skill = related(related(item.misconceptions)?.skills);
    return group.items.some(row => row.skill.id === skill?.id);
  });
  if (linked) return related(linked.misconceptions)?.title ?? "Recorded misconception";
  const low = group.items.filter(item => item.counts.startingQuestionCount && Number(item.comparison?.starting_percentage ?? 0) === 0);
  return low.length ? `Lowest initial indication: ${low.map(item => item.skill.title).join(", ")}.` : "Further assessment is required before a main gap can be confirmed.";
}
function feedbackCycle(review: Record<string, unknown>, attempts: Record<string, unknown>[]) {
  const answer = related(review.attempt_answers); const attempt = related(answer?.attempts);
  const question = related(answer?.questions); const activity = related(attempt?.activities);
  const followUp = attempts.find(item => item.activity_id === attempt?.activity_id && Number(item.attempt_number) > Number(attempt?.attempt_number));
  const before = nullableNumber(attempt?.percentage); const after = nullableNumber(followUp?.percentage);
  return {
    id: String(review.id), feedback: stringOrNull(review.feedback), followUp,
    parent: parentFromActivity(activity), skill: String(related(question?.skills)?.title ?? "Skill not linked"),
    original: before == null ? "Not recorded" : `${before}%`,
    learnerResponse: formatAnswer(answer?.answer) || "No learner response recorded",
    learnerAction: review.status === "returned" ? "Completed or was asked to complete further practice" : "Follow-up action not recorded",
    followUpText: after == null ? "No follow-up assessment recorded" : `${after}%`,
    improvement: before != null && after != null ? `${signed(after - before)} percentage points` : "Not calculable",
    teacherJudgement: review.reviewed_by ? `Reviewed ${formatDate(stringOrNull(review.reviewed_at))}` : "Not confirmed",
    nextAction: review.status === "returned" ? "Review the returned practice" : "No further action recorded",
  };
}
function feedbackTopicId(review: Record<string, unknown>) { const answer = related(review.attempt_answers); const attempt = related(answer?.attempts); const activity = related(attempt?.activities); const lesson = related(activity?.lessons); return related(lesson?.topics)?.id; }
function actionForTopic(actions: { metadata: unknown; action: string; reason: string }[], topic: string) { const action = actions.find(item => String(asRecord(item.metadata).topic ?? "").toLowerCase() === topic.toLowerCase()); return action ? `${action.action}: ${action.reason}` : null; }
function targetParent(target: { units: unknown; topics: unknown }) { const topic = related(target.topics); return `${related(target.units)?.title ?? related(topic?.units)?.title ?? "Course"} / ${topic?.title ?? "General target"}`; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 font-semibold">{value}</p></div>; }
function CompactFact({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-slate-700">{value}</dd></div>; }
function StatusBadge({ status }: { status: string }) { const style = /completed|established|achieved|independent/i.test(status) ? "bg-emerald-100 text-emerald-900" : /partial|limited|active|overdue|development/i.test(status) ? "bg-amber-100 text-amber-950" : "bg-slate-100 text-slate-700"; return <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>{status}</span>; }
function JudgementBadge({ value }: { value: string }) { return <StatusBadge status={value}/>; }
function AdditionalBlock({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold">{title}</h3><div className="mt-3 grid gap-2 text-sm text-slate-600">{children}</div></section>; }
function Empty({ text }: { text: string }) { return <p className="text-slate-600">{text}</p>; }
function related<T extends Record<string, unknown>>(value: T | T[] | null | undefined): T | undefined;
function related(value: unknown): Record<string, unknown> | undefined;
function related(value: unknown): Record<string, unknown> | undefined { return Array.isArray(value) ? value[0] as Record<string, unknown> | undefined : value && typeof value === "object" ? value as Record<string, unknown> : undefined; }
function nullableNumber(value: unknown) { return value == null ? null : Number(value); }
function stringOrNull(value: unknown) { return typeof value === "string" ? value : null; }
function signed(value: unknown) { const number = Number(value); return `${number >= 0 ? "+" : ""}${number}`; }
function formatDate(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString("en-GB") : "Not scheduled"; }
function formatDuration(value: number | null | undefined) { const seconds = Number(value ?? 0); return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`; }
function firstDate(values: (string | null)[]) { return formatDate(values.filter((value): value is string => Boolean(value)).sort()[0]); }
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function formatAnswer(value: unknown) { if (typeof value === "string") return value; try { return value == null ? "" : JSON.stringify(value); } catch { return String(value ?? ""); } }
function resultValue(value: unknown, key: string) { return related(asRecord(value) as Record<string, unknown>)?.[key] ?? (Array.isArray(value) ? related(value as Record<string, unknown>[])?.[key] : undefined); }
function assessmentDate(value: unknown) { const row = Array.isArray(value) ? related(value as Record<string, unknown>[]) : asRecord(value); const instance = Array.isArray(row?.assessment_instances) ? related(row.assessment_instances as Record<string, unknown>[]) : asRecord(row?.assessment_instances); return stringOrNull(instance?.completed_at) ?? stringOrNull(row?.created_at); }
function isCourseStartingPointComparison(row: Record<string, unknown>) {
  const skillTopic = related(related(row.skills)?.topics);
  const starting = related(row.starting_result);
  const instance = related(starting?.assessment_instances);
  const activity = related(instance?.activities);
  return String(skillTopic?.title ?? "").toLowerCase() === "course starting point"
    || String(activity?.title ?? "").toLowerCase().startsWith("course starting point");
}
function parentFromActivity(activityValue: unknown) { const activity = Array.isArray(activityValue) ? related(activityValue as Record<string, unknown>[]) : asRecord(activityValue); const lesson = Array.isArray(activity?.lessons) ? related(activity.lessons as Record<string, unknown>[]) : asRecord(activity?.lessons); const topic = Array.isArray(lesson?.topics) ? related(lesson.topics as Record<string, unknown>[]) : asRecord(lesson?.topics); const unit = Array.isArray(topic?.units) ? related(topic.units as Record<string, unknown>[]) : asRecord(topic?.units); return `${String(unit?.code ?? "Course")} ${String(unit?.title ?? "starting point and learner background")} · ${String(topic?.title ?? "Topic not linked")}`; }
