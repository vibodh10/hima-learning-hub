import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatWeeklyLearningDays } from "@/lib/weekly-schedule";
import { AppHeader } from "@/components/app-header";
import { ClassSettingsForm } from "@/components/class-forms";
import { StudentInvitationForm } from "@/components/student-invitation-form";
import { ClassRegistrationLinkPanel } from "@/components/class-registration-link-panel";
import { InvitationLifecycleControls } from "@/components/invitation-lifecycle-controls";
import { ClassOnboardingPanel } from "@/components/class-onboarding-panel";
import { RoleBanner } from "@/components/role-banner";
import { presentInvitationStatus } from "@/lib/invitation-status";
import { unitByCode } from "@/lib/learning-catalog";
import { projectClassCurriculumOverview, projectCurriculumPaperAssessments } from "@/lib/class-curriculum-overview";
import { averageCurrentClassScore } from "@/lib/class-progress-summary";
import { ClassCurriculumOverviewTable } from "@/components/class-curriculum-overview-table";
import { summariseWorkbookStartingPoint } from "@/lib/workbook-starting-point";
import { applyWeeklyLearningGaps } from "@/lib/teacher-weekly-attention";

type AttentionRow={learner_id:string;display_name:string;starting_score:number|null;current_score:number|null;progress_points:number|null;catch_up_status:string;outstanding_count:number;attention_status:string;attention_reason:string;ap_total:number;achievement_level:string|null};

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("teacher", "administrator");
  const { id } = await params;
  const supabase = await createClient();
  const { data: classData } = await supabase.from("classes")
    .select("id,name,course_id,academic_period_id,active_unit_id,starts_on,ends_on,weekly_learning_day,weekly_learning_days,published,enrolment_code_hint,courses(title),enrolments(student_id,archived_at,user_profiles!enrolments_student_id_fkey(display_name)),class_units(unit_id,active,archived_at)")
    .eq("id", id).single();
  if (!classData) notFound();
  const selectedUnitIds = (classData.class_units ?? [])
    .filter(unit => unit.active && !unit.archived_at)
    .map(unit => unit.unit_id);
  const administrator = actor.role === "administrator";
  const [{ data: courses }, { data: units }, { data: periods }, {data:invitations}, {data:registrationLinks}] = await Promise.all([
    administrator
      ? supabase.from("courses").select("id,title").eq("active", true).is("archived_at", null).order("title")
      : Promise.resolve({ data: [] }),
    administrator
      ? supabase.from("units").select("id,course_id,code,title,kind,initial_teaching").is("archived_at", null).order("sort_order")
      : selectedUnitIds.length
        ? supabase.from("units").select("id,course_id,code,title,kind,initial_teaching").in("id", selectedUnitIds).is("archived_at", null).order("sort_order")
        : Promise.resolve({ data: [] }),
    administrator
      ? supabase.from("academic_periods").select("id,name,kind,academic_years(name)").is("archived_at", null).order("starts_on")
      : Promise.resolve({ data: [] }),
    supabase.from("student_invitations").select("id,email_normalized,display_name,status,auth_user_id,invited_at,last_sent_at,accepted_at,cancelled_at,expired_at,send_count,last_detail_code,updated_at").eq("class_id",id).order("updated_at",{ascending:false}).limit(50),
    supabase.rpc("current_class_registration_link",{class_uuid:id}),
  ]);
  const selectedUnits = (units ?? []).filter(unit => selectedUnitIds.includes(unit.id));
  const overviewUnit = selectedUnits.find(unit => unit.id === classData.active_unit_id) ?? selectedUnits[0];
  const activeEnrolments = (classData.enrolments ?? []).filter(enrolment => !enrolment.archived_at);
  const [{ data: journeyTemplates }, { data: journeyPositions }, {data:attentionRows,error:attentionError},{data:weeklyGapRows,error:weeklyGapError},{data:achievementRows}] = await Promise.all([
    selectedUnitIds.length
      ? supabase.from("learning_journey_templates")
        .select("id,unit_id,title,version_number,total_teaching_weeks,units(code,title)")
        .in("unit_id", selectedUnitIds).eq("status", "approved").is("archived_at", null)
        .order("version_number", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.rpc("current_class_learning_journey", { class_uuid: id }),
    supabase.rpc("class_learner_attention",{class_uuid:id}),
    supabase.rpc("class_learner_weekly_gaps",{class_uuid:id}),
    supabase.rpc("class_learner_achievement",{class_uuid:id}),
  ]);
  const journeyPosition = journeyPositions?.[0];
  const automaticJourneyTemplate = (journeyTemplates ?? []).find(
    template => template.unit_id === classData.active_unit_id,
  );
  const achievementByLearner=new Map(((achievementRows??[]) as {learner_id:string;ap_total:number;achievement_level:string|null}[]).map(row=>[row.learner_id,row]));
  const attention=applyWeeklyLearningGaps(
    (attentionRows??[]) as Omit<AttentionRow,"ap_total"|"achievement_level">[],
    weeklyGapRows??[],
  ).map(row=>({...row,
    ap_total:achievementByLearner.get(row.learner_id)?.ap_total??0,
    achievement_level:achievementByLearner.get(row.learner_id)?.achievement_level??null,
  }));
  const studentIds = activeEnrolments.map(enrolment => enrolment.student_id);
  const [
    { data: mastery, error: masteryError },
    { data: misconceptions, error: misconceptionsError },
    { data: curriculumAttempts, error: curriculumAttemptsError },
  ] = studentIds.length && overviewUnit ? await Promise.all([
    supabase.from("skill_mastery")
      .select("learner_id,mastery_score,current_pathway,skills!inner(title,topics!inner(unit_id))")
      .in("learner_id", studentIds).eq("skills.topics.unit_id", overviewUnit.id),
    supabase.from("learner_misconceptions")
      .select("learner_id,occurrence_count,resolved_at,misconceptions!inner(title,skills!inner(title,topics!inner(unit_id)))")
      .in("learner_id", studentIds).eq("misconceptions.skills.topics.unit_id", overviewUnit.id)
      .order("occurrence_count", { ascending: false }),
    supabase.from("learner_curriculum_attempts")
      .select("learner_id,kind,unit_code,paper_mode,percentage,teacher_mark,max_mark,completed_at")
      .in("learner_id", studentIds).eq("unit_code", overviewUnit.code).order("completed_at"),
  ]) : [
    { data: [], error: null },
    { data: [], error: null },
    { data: [], error: null },
  ];
  const [progressResult,assessmentResult,targetResult] = studentIds.length ? await Promise.all([
    overviewUnit
      ? supabase.from("learner_curriculum_progress").select(
        "learner_id,unit_code,topic_code,selected_level,topic_started_at,lesson_completed_at,mastery_score,mastered_at,current_section,independent_attempts,evidence,updated_at",
      ).in("learner_id", studentIds).eq("unit_code", overviewUnit.code).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("assessment_instances").select(
      "learner_id,kind,completed_at,attempts(percentage),activities(title)",
    ).eq("class_id", id).in("learner_id", studentIds).not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
    supabase.from("targets").select("learner_id,status,target_date")
      .eq("class_id", id).in("learner_id", studentIds)
      .in("status", ["approved", "active", "extended"]).is("archived_at", null)
      .order("target_date"),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  const {data:curriculumOverviewProgress,error:curriculumOverviewProgressError}=progressResult;
  const {data:curriculumOverviewAssessments,error:curriculumOverviewAssessmentsError}=assessmentResult;
  const {data:curriculumOverviewTargets,error:curriculumOverviewTargetsError}=targetResult;

  const configuredOverviewUnit = overviewUnit ? unitByCode(String(overviewUnit.code)) : undefined;
  const startingPointByLearner = new Map(studentIds.flatMap(learnerId => {
    if (!configuredOverviewUnit) return [];
    const summary = summariseWorkbookStartingPoint(
      (curriculumOverviewProgress ?? []).filter(row => row.learner_id === learnerId),
      configuredOverviewUnit.code,
      configuredOverviewUnit.topics.map(topic => topic.code),
    );
    return summary?.complete ? [[learnerId, summary] as const] : [];
  }));
  const projectedAttention = attention.map(row => {
    const startingPoint = startingPointByLearner.get(row.learner_id);
    if (!startingPoint || row.starting_score != null) return row;
    const route = startingPoint.recommendedLevel ? ` · ${startingPoint.recommendedLevel} route` : "";
    return {
      ...row,
      starting_score: startingPoint.percentage,
      attention_reason: row.current_score == null
        ? `Unit ${startingPoint.unitCode} starting point recorded at ${startingPoint.percentage}%${route}. Comparable progress evidence is not yet available.`
        : row.attention_reason,
    };
  });
  const learningReady=Boolean(configuredOverviewUnit&&automaticJourneyTemplate);
  const overviewModules = configuredOverviewUnit?.topics.map(topic => ({
    code: topic.code, title: topic.title,
  })) ?? [...new Set((curriculumOverviewProgress ?? []).map(row => row.topic_code))]
    .map(code => ({ code, title: code }));
  const curriculumOverviewError = attentionError ?? weeklyGapError ?? curriculumAttemptsError ?? curriculumOverviewProgressError
    ?? curriculumOverviewAssessmentsError ?? curriculumOverviewTargetsError;
  const classAnalysisError = masteryError ?? misconceptionsError;
  const curriculumOverview = curriculumOverviewError ? [] : projectClassCurriculumOverview({
    generatedAt: new Date().toISOString(),
    learners: activeEnrolments.map(enrolment => ({
      id: enrolment.student_id,
      name: related(enrolment.user_profiles)?.display_name ?? "Learner",
    })),
    modules: overviewModules,
    progress: (curriculumOverviewProgress ?? []).map(row => ({
      learnerId: row.learner_id, topicCode: row.topic_code,
      topicStartedAt: row.topic_started_at, lessonCompletedAt: row.lesson_completed_at,
      masteryScore: row.mastery_score == null ? null : Number(row.mastery_score),
      masteredAt: row.mastered_at, currentSection: row.current_section,
      independentAttempts: Number(row.independent_attempts ?? 0), updatedAt: row.updated_at,
    })),
    assessments: [
      ...(curriculumOverviewAssessments ?? []).map(row => ({
        learnerId: row.learner_id, title: related(row.activities)?.title ?? null,
        kind: row.kind, percentage: related(row.attempts)?.percentage == null
          ? null : Number(related(row.attempts)?.percentage),
        completedAt: String(row.completed_at),
      })),
      ...projectCurriculumPaperAssessments((curriculumAttempts ?? []).map(row => ({
        learnerId: row.learner_id, kind: row.kind, unitCode: row.unit_code,
        paperMode: row.paper_mode, percentage: Number(row.percentage),
        teacherMark: row.teacher_mark == null ? null : Number(row.teacher_mark),
        maxMark: Number(row.max_mark), completedAt: String(row.completed_at),
      })), String(overviewUnit?.code ?? "")),
    ],
    targets: (curriculumOverviewTargets ?? []).map(row => ({
      learnerId: row.learner_id, status: row.status, targetDate: row.target_date,
    })),
    attention: projectedAttention.map(row => ({
      learnerId: row.learner_id, startingScore: row.starting_score,
      status: row.attention_status, reason: row.attention_reason,
    })),
  });

  const average = averageCurrentClassScore(projectedAttention.map(row => ({ currentScore: row.current_score })));
  const awaitingInvitationCount=invitations?.filter(invitation=>["pending","sent"].includes(invitation.status)).length??0;
  const activeRegistrationLink=registrationLinks?.[0];

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <RoleBanner role={actor.role}/>
    <Link className="link mt-6 inline-block" href="/dashboard">← Teacher dashboard</Link>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">My group</p><h1 className="mt-2 text-4xl font-bold">{classData.name}</h1><p className="mt-2 text-slate-600">{related(classData.courses)?.title}</p><p className="mt-1 text-sm text-slate-500">{formatWeeklyLearningDays(classData.weekly_learning_days,classData.weekly_learning_day)}</p></div><div className="flex flex-wrap items-center gap-3"><Link className="button" href={`/api/reports/classes/${id}`}>Download progress report</Link><Link className="button-secondary" href={`/api/reports/classes/${id}?format=csv`}>Download spreadsheet</Link></div></div>

    <section className="mt-8 grid gap-5 sm:grid-cols-3"><Metric label="Students" value={String(studentIds.length)}/><Metric label="Latest progress" value={average == null ? "Not available" : `${average}%`}/><Metric label="Need attention" value={String(projectedAttention.filter(row=>["intervention_required","action_required","catch_up_required"].includes(row.attention_status)).length)}/></section>

    {studentIds.length>0&&<section className="card mt-8 overflow-x-auto p-0"><div className="p-5"><p className="eyebrow">Students</p><h2 className="mt-2 text-2xl font-bold">Progress at a glance</h2><p className="mt-2 text-sm text-slate-600">Students needing help appear first. Open one student for their full evidence.</p></div><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-50 text-sm text-slate-600"><tr><th className="p-5">Student</th><th className="p-5">Latest progress</th><th className="p-5">Status</th><th className="p-5">Open</th></tr></thead>
      <tbody>{projectedAttention.map(row => <tr key={row.learner_id} className="border-t border-slate-200"><td className="p-5 font-semibold">{row.display_name}</td><td className="p-5"><strong>{row.current_score==null?"Not recorded":`${row.current_score}%`}</strong>{row.progress_points!=null&&<p className="mt-1 text-xs text-slate-500">{Number(row.progress_points)>=0?"+":""}{row.progress_points} percentage points</p>}</td><td className="p-5"><AttentionStatus status={row.attention_status}/><p className="mt-2 max-w-md text-xs text-slate-600">{row.attention_reason}</p></td><td className="p-5"><Link className="button-secondary button-small" href={`/teacher/learners/${row.learner_id}?classId=${id}`}>View progress</Link></td></tr>)}</tbody>
    </table></section>}

    {selectedUnits.length>0&&<details className="card mt-6" aria-labelledby="unit-report-title">
      <summary className="cursor-pointer text-lg font-bold" id="unit-report-title">More report formats</summary>
      <p className="eyebrow mt-5">Evidence exports</p><h2 className="mt-2 text-2xl font-bold">Unit evidence reports</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">Each export is restricted to this group and selected unit. It uses stored starting-point, learning, assessment, feedback, target, intervention and next-step evidence; missing evidence remains explicit.</p>
      <div className="mt-5 grid gap-3">{selectedUnits.map(unit=><article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4" key={unit.id}><div><h3 className="font-bold">Unit {unit.code}: {unit.title}</h3><p className="mt-1 text-xs text-slate-500">Class-unit cohort evidence</p></div><div className="flex flex-wrap gap-2"><a className="button-secondary" href={`/api/reports/classes/${id}/units/${unit.id}?format=csv`}>Unit CSV</a><a className="button" href={`/api/reports/classes/${id}/units/${unit.id}`}>Unit PDF</a></div></article>)}</div>
    </details>}

    {actor.role==="administrator"&&<details className="card mt-6"><summary className="cursor-pointer text-lg font-bold">Administrator group setup</summary><p className="mt-2 text-sm text-slate-600">Teachers do not see or manage these settings.</p><ClassSettingsForm classData={classData} courses={courses ?? []} units={units ?? []} periods={periods ?? []} selectedUnitIds={selectedUnitIds}/></details>}
    <ClassOnboardingPanel studentCount={studentIds.length} awaitingCount={awaitingInvitationCount}>
      {selectedUnitIds.length>0&&classData.published&&learningReady
        ? <>
          <ClassRegistrationLinkPanel classId={id} activeLink={activeRegistrationLink ? {
            id:activeRegistrationLink.id,
            expiresAt:activeRegistrationLink.expires_at,
            registrationCount:Number(activeRegistrationLink.registration_count),
            maxRegistrations:Number(activeRegistrationLink.max_registrations),
          } : null}/>
          <details className="card mt-6"><summary className="cursor-pointer text-lg font-bold">Email invitation, if college email allows it</summary><p className="mt-3 text-sm text-slate-600">You can ignore this option when college mail filters block invitations.</p><StudentInvitationForm classId={id}/></details>
        </>
        : <section className="card mt-6 border-amber-200 bg-amber-50"><p className="eyebrow">Invitation paused</p><h2 className="mt-2 text-xl font-bold">{!learningReady?"Learning journey not release-ready":"Save and make your units visible first"}</h2><p className="mt-2 text-sm text-amber-950">{!learningReady?"This active unit does not yet have both verified portal content and an approved automatic journey. Invitations stay disabled so students cannot enter an incomplete learning experience.":"Complete the group settings, including making the units visible, before inviting students."}</p></section>}

      <details className={`card mt-6 ${learningReady?"border-teal-200 bg-teal-50":"border-amber-200 bg-amber-50"}`} aria-labelledby="automation-status-title"><summary className="cursor-pointer text-lg font-bold" id="automation-status-title">{learningReady?"Learning is ready and automatic":"Learning setup needs attention"}</summary><p className="mt-3 text-sm text-slate-700">{learningReady?"The starting point, adaptive practice and progress reports begin automatically after a student joins.":"This unit is missing verified content or an approved learning journey. An administrator must complete it first."}</p>{learningReady&&<div className="mt-3 grid gap-2 text-sm text-slate-700"><p>✓ Adaptation changes support and challenge, not the group timetable.</p><p>✓ Mistakes lead to explanations and further practice.</p><p>✓ Reports update from genuine stored activity.</p><p>✓ Teachers do not configure thresholds, weekly plans, rewards or adaptive homework.</p></div>}</details>

      {Boolean(invitations?.length)&&<section className="card mt-6" aria-labelledby="invitation-status-title">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Student onboarding</p><h2 className="mt-2 text-2xl font-bold" id="invitation-status-title">Invitation status</h2><p className="mt-2 text-sm text-slate-600">This is the durable invitation record. “Invitation sent” is not the same as “Joined”.</p></div><span className="text-sm text-slate-500">{invitations?.filter(invitation=>["pending","sent"].includes(invitation.status)).length??0} awaiting response</span></div>
      <div className="mt-5 grid gap-3">{invitations?.map(invitation=>{const presentation=presentInvitationStatus(invitation.status,invitation.last_detail_code,activeEnrolments.some(enrolment=>enrolment.student_id===invitation.auth_user_id));return <article className="rounded-xl border border-slate-200 p-4" key={invitation.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{invitation.display_name}</h3><p className="mt-1 text-sm text-slate-600">{invitation.email_normalized}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${presentation.className}`}>{presentation.label}</span></div><p className="mt-3 text-sm text-slate-700">{presentation.detail}</p><p className="mt-2 text-xs text-slate-500">Requested {formatDateTime(invitation.invited_at)}{invitation.last_sent_at?` · last sent ${formatDateTime(invitation.last_sent_at)} · ${invitation.send_count} send${invitation.send_count===1?"":"s"}`:""}{invitation.accepted_at?` · joined ${formatDateTime(invitation.accepted_at)}`:""}{invitation.cancelled_at?` · cancelled ${formatDateTime(invitation.cancelled_at)}`:""}{invitation.expired_at?` · expired ${formatDateTime(invitation.expired_at)}`:""}</p><InvitationLifecycleControls invitationId={invitation.id} classId={id} status={invitation.status}/></article>})}</div>
      </section>}
    </ClassOnboardingPanel>

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
    </section> : studentIds.length>0
      ? <section className="card mt-6 border-red-200 bg-red-50" role="alert"><p className="eyebrow">Automatic journey check</p><h2 className="mt-2 text-2xl font-bold">Learning journey needs system attention</h2><p className="mt-3 text-sm text-red-900">A learner is enrolled but the automatic class journey is missing. Do not ask the teacher to configure it manually; this group should remain out of use until the release check repairs or verifies the automation.</p></section>
      : selectedUnitIds.length>0&&classData.published
        ? <section className={`card mt-6 ${automaticJourneyTemplate ? "border-teal-200 bg-teal-50" : "border-amber-200 bg-amber-50"}`} aria-labelledby="automatic-journey-title">
          <p className="eyebrow">Automatic class journey</p>
          <h2 className="mt-2 text-2xl font-bold" id="automatic-journey-title">{automaticJourneyTemplate ? "Ready for the first student" : "No approved journey for the active unit"}</h2>
          {automaticJourneyTemplate
            ? <p className="mt-3 max-w-3xl text-sm text-slate-700">When the first student accepts their secure invitation, their account and enrolment are confirmed before <strong>{automaticJourneyTemplate.title}</strong> begins at Teaching Week 1. Sending an email alone does not start the journey.</p>
            : <p className="mt-3 max-w-3xl text-sm text-amber-950">Students can still accept invitations and use their assigned resources, but the shared teaching-week journey will remain unstarted until an administrator approves one for the class&apos;s active unit.</p>}
        </section>
        : null}
    {studentIds.length>0&&overviewUnit&&<details className="card mt-8"><summary className="cursor-pointer text-lg font-bold">Detailed unit progress table</summary><p className="mt-2 text-sm text-slate-600">Optional module-by-module evidence. The student list below is enough for everyday use.</p>{(
      curriculumOverviewError
        ? <section className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5" role="alert" aria-labelledby="curriculum-overview-error-title">
          <p className="eyebrow">Class curriculum</p>
          <h2 className="mt-2 text-2xl font-bold" id="curriculum-overview-error-title">Curriculum evidence is temporarily unavailable</h2>
          <p className="mt-3 text-sm text-red-900">The portal could not verify every required evidence source, so it has not displayed an empty-looking class table. Refresh or use the unit report after the data connection recovers.</p>
        </section>
        : <ClassCurriculumOverviewTable classId={id} unit={overviewUnit} rows={curriculumOverview}/>
    )}</details>}
    {studentIds.length>0&&!overviewUnit&&<section className="card mt-8 border-amber-200 bg-amber-50"><p className="eyebrow">Class curriculum</p><h2 className="mt-2 text-2xl font-bold">Select an active unit</h2><p className="mt-3 text-sm text-amber-950">The curriculum overview remains unavailable until an administrator selects an active unit for this group. No progress state has been inferred.</p></section>}
    {studentIds.length>0&&<details className="card mt-6"><summary className="cursor-pointer text-lg font-bold">More class analysis</summary>{classAnalysisError
      ? <section className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5" role="alert"><h2 className="font-bold">Class analysis is temporarily unavailable</h2><p className="mt-2 text-sm text-red-900">No mastery or misconception totals have been inferred. Try again later.</p></section>
      : <section className="mt-5 grid gap-6 lg:grid-cols-2">
      <div className="card"><h2 className="text-2xl font-bold">Mastery distribution</h2><p className="mt-2 text-sm text-slate-600">Number of learner-skill records at each current pathway.</p><div className="mt-5 grid grid-cols-2 gap-3">{["Support","Core","Stretch","Mastery"].map(pathway => <Metric key={pathway} label={pathway} value={String(mastery?.filter(skill => skill.current_pathway === pathway).length ?? 0)}/>)}</div></div>
      <div className="card"><h2 className="text-2xl font-bold">Common misconceptions</h2><p className="mt-2 text-sm text-slate-600">Repeated patterns support re-teaching decisions and intervention review.</p><div className="mt-5 grid gap-3">{misconceptions?.length ? misconceptions.slice(0, 6).map((row, index) => <div className="rounded-xl bg-amber-50 p-4" key={index}><p className="font-semibold">{related(row.misconceptions)?.title}</p><p className="mt-1 text-sm text-amber-900">{related(related(row.misconceptions)?.skills)?.title} · {row.occurrence_count} occurrences · {row.resolved_at ? "resolved" : "open"}</p></div>) : <p className="text-slate-600">No tagged misconception evidence yet.</p>}</div></div>
    </section>}</details>}
  </main></>;
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
function formatDateTime(value:string) {
  return new Date(value).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
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
