import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { AdminSettingsForm } from "@/components/admin-settings-form";
import { BadgeDefinitionForm } from "@/components/gamification-config-forms";
import { RewardReconciliationForm } from "@/components/safe-learning-admin-forms";
import { AcademicCalendarForm } from "@/components/academic-calendar-form";
import { AchievementLevelForm, AchievementRuleForm, CertificateEligibilityReviewForm, RecognitionTemplateForm } from "@/components/achievement-config-forms";
import {
  AcademicYearCreateForm, AcademicYearStatusForm, CourseStatusForm,
  CurriculumVersionCreateForm, CurriculumVersionStatusForm,
  LearnerDeletionExecuteForm, ProfileManagementForm,
} from "@/components/admin-governance-forms";

export default async function AdminPage(){
  const actor=await requireRole("administrator");
  const supabase=await createClient();
  const[
    {data:profiles},{data:courses},{data:versions},{data:years},
    {data:classes},{data:audit},{data:retention},{data:badges},{data:deletionRequests},
    {data:periods},{data:calendarEvents},{data:achievementRules},{data:achievementLevels},{data:recognitionTemplates},{data:certificateReviews},
    {data:attendanceConnection},{count:attendanceEventCount},
  ]=await Promise.all([
    supabase.from("user_profiles").select("id,display_name,role,created_at,archived_at").order("display_name"),
    supabase.from("courses").select("id,title,qualification_type,qualification_level,active,archived_at").order("title"),
    supabase.from("curriculum_versions").select("id,version_label,specification_year,active,archived_at,courses(title)").order("created_at",{ascending:false}),
    supabase.from("academic_years").select("id,name,starts_on,ends_on,archived_at").order("starts_on",{ascending:false}),
    supabase.from("classes").select("id,name,published,archived_at,courses(title)").order("name"),
    supabase.from("audit_logs").select("id,action,entity_type,occurred_at,user_profiles!audit_logs_actor_id_fkey(display_name)").order("occurred_at",{ascending:false}).limit(100),
    supabase.from("retention_settings").select("learner_evidence_years,audit_log_years,archived_class_years,deletion_requires_approval").maybeSingle(),
    supabase.from("badge_definitions").select("id,title,description,criteria,enabled").is("archived_at",null).order("title"),
    supabase.from("learner_data_deletion_requests").select("id,reason,requested_at,user_profiles!learner_data_deletion_requests_learner_id_fkey(display_name)").eq("status","pending").order("requested_at"),
    supabase.from("academic_periods").select("id,name,academic_year_id").is("archived_at",null).order("starts_on"),
    supabase.from("academic_calendar_events").select("id,academic_year_id,academic_period_id,title,kind,starts_on,ends_on,metadata").is("archived_at",null).order("starts_on"),
    supabase.from("achievement_point_rules").select("id,title,points,enabled").order("title"),
    supabase.from("achievement_levels").select("id,title,threshold,certificate_eligible,enabled").order("threshold"),
    supabase.from("recognition_templates").select("id,title,category,message,enabled").order("category"),
    supabase.from("certificate_eligibility_reviews").select("id,status,eligible_at,user_profiles!certificate_eligibility_reviews_learner_id_fkey(display_name),achievement_levels(title)").eq("status","pending_review").order("eligible_at"),
    supabase.from("attendance_provider_connections").select("provider_name,connection_status,last_import_at").maybeSingle(),
    supabase.from("attendance_events").select("id",{count:"exact",head:true}),
  ]);
  const activeCourses=(courses??[]).filter(course=>course.active&&!course.archived_at);
  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href="/dashboard">← Dashboard</Link>
    <div className="mt-7"><p className="eyebrow">Administrator</p><h1 className="mt-2 text-4xl font-bold">Curriculum, users and governance</h1><p className="mt-2 text-slate-600">Historical versions and evidence are archived, not overwritten.</p></div>
    <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Teachers / administrators" value={String(profiles?.filter(profile=>profile.role!=="student"&&!profile.archived_at).length??0)}/>
      <Metric label="Courses" value={String(activeCourses.length)}/>
      <Metric label="Curriculum versions" value={String(versions?.length??0)}/>
      <Metric label="Classes" value={String(classes?.filter(item=>!item.archived_at).length??0)}/>
    </section>
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card"><h2 className="text-2xl font-bold">Courses and immutable versions</h2><div className="mt-4 grid gap-3">{courses?.map(course=><div className="rounded-xl border border-slate-200 p-4" key={course.id}>
        <strong>{course.title}</strong>
        <p className="mt-1 text-sm text-slate-500">{course.qualification_type} · {course.qualification_level} · {course.active?"active":"inactive"}</p>
        <CourseStatusForm courseId={course.id} active={course.active}/>
        {versions?.filter(version=>related(version.courses)?.title===course.title).map(version=><div className="mt-3 rounded-lg bg-slate-50 p-3" key={version.id}>
          <p className="text-sm">{version.version_label} ({version.specification_year}) · {version.archived_at?"archived":version.active?"active":"inactive"}</p>
          <CurriculumVersionStatusForm versionId={version.id} active={version.active&&!version.archived_at}/>
        </div>)}
      </div>)}</div></div>
      <div className="card"><h2 className="text-2xl font-bold">Academic years</h2><div className="mt-4 grid gap-3">{years?.map(year=><div className="rounded-xl bg-slate-50 p-4" key={year.id}>
        <strong>{year.name}</strong>
        <p className="mt-1 text-sm text-slate-500">{new Date(year.starts_on).toLocaleDateString("en-GB")} to {new Date(year.ends_on).toLocaleDateString("en-GB")}{year.archived_at?" · archived":""}</p>
        <AcademicYearStatusForm yearId={year.id} archived={Boolean(year.archived_at)}/>
      </div>)}</div><AcademicYearCreateForm/></div>
    </section>
    <section className="card mt-6"><p className="eyebrow">Academic calendar</p><h2 className="mt-2 text-2xl font-bold">Holidays and non-teaching periods</h2><p className="mt-2 text-sm text-slate-600">These organisation-wide dates pause every active group journey. Teachers do not pause or resume groups manually.</p><div className="mt-5"><AcademicCalendarForm years={(years??[]).filter(year=>!year.archived_at).map(year=>({id:year.id,name:year.name}))} periods={periods??[]}/></div><div className="mt-6 grid gap-3">{calendarEvents?.map(event=><details className="rounded-xl border border-slate-200 p-4" key={event.id}><summary className="cursor-pointer font-semibold">{event.title} · {event.kind.replaceAll("_"," ")} · {new Date(`${event.starts_on}T12:00:00Z`).toLocaleDateString("en-GB",{timeZone:"UTC"})}</summary><div className="mt-4"><AcademicCalendarForm years={(years??[]).filter(year=>!year.archived_at).map(year=>({id:year.id,name:year.name}))} periods={periods??[]} event={event}/></div></details>)}</div></section>
    <CurriculumVersionCreateForm courses={activeCourses.map(course=>({id:course.id,title:course.title}))}/>
    <section className="card mt-6"><p className="eyebrow">Role-based access</p><h2 className="mt-2 text-2xl font-bold">Manage teachers and users</h2><p className="mt-2 text-sm text-slate-600">Archiving removes access while preserving historical evidence and audit records.</p><div className="mt-5 grid gap-4">{profiles?.map(profile=><ProfileManagementForm profile={profile} key={profile.id}/>)}</div></section>
    {Boolean(deletionRequests?.length)&&<section className="card mt-6"><p className="eyebrow text-red-700">Privacy requests</p><h2 className="mt-2 text-2xl font-bold">Pending learner-data deletions</h2><p className="mt-2 text-sm text-slate-600">Confirm only after checking authorisation and exporting any evidence that must lawfully be retained.</p><div className="mt-5 grid gap-4">{deletionRequests?.map(request=><LearnerDeletionExecuteForm request={request} key={request.id}/>)}</div></section>}
    <section className="mt-6"><AdminSettingsForm settings={retention}/></section>
    <section className="card mt-6"><p className="eyebrow">Coin integrity</p><h2 className="mt-2 text-2xl font-bold">Reward purchase reconciliation</h2><p className="mt-2 text-sm text-slate-600">Find historic debits that did not create completed ownership and issue an explicit refund ledger entry. Successful purchases are left unchanged.</p><RewardReconciliationForm/></section>
    <section className="card mt-6"><p className="eyebrow">Computing Achievement</p><h2 className="mt-2 text-2xl font-bold">Achievement Points and levels</h2><p className="mt-2 text-sm text-slate-600">These cumulative AP rules are separate from spendable cosmetic coins. Gold and Diamond can only create certificate eligibility for authorised staff review.</p><h3 className="mt-6 text-lg font-bold">Point rules</h3><div className="mt-4 grid gap-4 lg:grid-cols-2">{achievementRules?.map(rule=><AchievementRuleForm rule={rule} key={rule.id}/>)}</div><h3 className="mt-7 text-lg font-bold">Levels</h3><div className="mt-4 grid gap-4 lg:grid-cols-2">{achievementLevels?.map(level=><AchievementLevelForm level={level} key={level.id}/>)}</div></section>
    <section className="card mt-6"><p className="eyebrow">Authorised recognition review</p><h2 className="mt-2 text-2xl font-bold">Certificate eligibility</h2><p className="mt-2 text-sm text-slate-600">Review Gold and Diamond threshold eligibility against the learner&apos;s evidence. A confirmed review does not issue or promise an SCCB certificate.</p><div className="mt-5 grid gap-4 lg:grid-cols-2">{certificateReviews?.map(review=><CertificateEligibilityReviewForm review={{id:review.id,learnerName:related(review.user_profiles)?.display_name??"Learner",levelTitle:related(review.achievement_levels)?.title??"Achievement level",eligibleAt:review.eligible_at}} key={review.id}/>)}{!certificateReviews?.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No certificate eligibility reviews are pending.</p>}</div></section>
    <section className="card mt-6"><p className="eyebrow">Authorised college data</p><h2 className="mt-2 text-2xl font-bold">Attendance integration</h2><p className="mt-2 text-sm text-slate-600">Attendance is provider-derived and never maintained by ordinary teachers in this portal.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Connection" value={attendanceConnection?.connection_status?.replaceAll("_"," ")??"not configured"}/><Metric label="Provider" value={attendanceConnection?.provider_name??"Not configured"}/><Metric label="Imported events" value={String(attendanceEventCount??0)}/><Metric label="Last import" value={attendanceConnection?.last_import_at?new Date(attendanceConnection.last_import_at).toLocaleString("en-GB"):"No import recorded"}/></div><p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">A connected authorised provider can supply session events and support the configurable 95% attendance achievement rule. Until a provider is connected and events are imported, no attendance result or achievement is claimed.</p></section>
    <section className="card mt-6"><p className="eyebrow">You&apos;ve been noticed</p><h2 className="mt-2 text-2xl font-bold">Recognition templates</h2><p className="mt-2 text-sm text-slate-600">Teachers select these short professional messages when their judgement is required.</p><div className="mt-5 grid gap-4 lg:grid-cols-2">{recognitionTemplates?.map(template=><RecognitionTemplateForm template={template} key={template.id}/>)}</div></section>
    <section className="card mt-6"><p className="eyebrow">Configurable recognition</p><h2 className="mt-2 text-2xl font-bold">Badge criteria</h2><p className="mt-2 text-sm text-slate-600">Criteria changes are administrator-only and recorded in the audit log.</p><div className="mt-5 grid gap-4 lg:grid-cols-2">{badges?.map(badge=><BadgeDefinitionForm badge={badge} key={badge.id}/>)}</div></section>
    <section className="card mt-6 overflow-x-auto"><h2 className="text-2xl font-bold">Audit log</h2><table className="mt-4 w-full min-w-[680px] text-left text-sm"><thead><tr><th className="pb-3">Date</th><th className="pb-3">Actor</th><th className="pb-3">Action</th><th className="pb-3">Entity</th></tr></thead><tbody>{audit?.map(row=><tr className="border-t border-slate-200" key={row.id}><td className="py-3">{new Date(row.occurred_at).toLocaleString("en-GB")}</td><td>{related(row.user_profiles)?.display_name??"System"}</td><td>{row.action}</td><td>{row.entity_type}</td></tr>)}</tbody></table></section>
  </main></>;
}

function Metric({label,value}:{label:string;value:string}){return <div className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>}
function related<T>(value:T|T[]|null|undefined):T|undefined{return Array.isArray(value)?value[0]:value??undefined}
